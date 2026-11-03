import prisma from "../../../data/postgres";
import { num, r2 } from "./helpers";
import type { Rango } from "./helpers";

const ESTADOS_DEVENGADOS = ['APROBADO', 'PAGADO', 'CERRADO'];

// ─── Costo laboral por período y empleado ───────────────────────────────
// Planillas aprobadas/pagadas/cerradas cuyo período termina en el rango, más las
// provisiones (vacaciones, décimo tercer mes, indemnización) generadas en esos períodos.
export async function costoLaboral(r: Rango) {
    const periodos = await prisma.periodosplanilla.findMany({
        where: { fechafin: { gte: r.inicio, lte: r.fin }, estado: { in: ESTADOS_DEVENGADOS } },
        orderBy: { fechainicio: 'asc' },
    });
    const ids = periodos.map(p => p.periodoid);

    const [detalles, vac, dec, ind] = ids.length ? await Promise.all([
        prisma.planilladetalle.findMany({ where: { periodoid: { in: ids } }, include: { empleados: { select: { nombre: true, apellidos: true, cargo: true } } } }),
        prisma.acumuladovacaciones.findMany({ where: { periodoid: { in: ids } } }),
        prisma.acumuladodecimoprimermes.findMany({ where: { periodoid: { in: ids } } }),
        prisma.acumuladoindemnizacion.findMany({ where: { periodoid: { in: ids } } }),
    ]) : [[], [], [], []];

    interface Acum { salario: number; horasExtra: number; otrosIngresos: number; inssPatronal: number; provisiones: number }
    const vacio = (): Acum => ({ salario: 0, horasExtra: 0, otrosIngresos: 0, inssPatronal: 0, provisiones: 0 });
    const costo = (a: Acum) => a.salario + a.horasExtra + a.otrosIngresos + a.inssPatronal + a.provisiones;
    const redondear = (a: Acum) => ({ salario: r2(a.salario), horasExtra: r2(a.horasExtra), otrosIngresos: r2(a.otrosIngresos), inssPatronal: r2(a.inssPatronal), provisiones: r2(a.provisiones), costoTotal: r2(costo(a)) });

    const porEmpleado = new Map<number, { nombre: string; cargo: string; acum: Acum }>();
    const porPeriodo = new Map<number, Acum>();
    const emp = (id: number, nombre = '', cargo = '') => {
        if (!porEmpleado.has(id)) porEmpleado.set(id, { nombre, cargo, acum: vacio() });
        return porEmpleado.get(id)!;
    };
    const per = (id: number) => {
        if (!porPeriodo.has(id)) porPeriodo.set(id, vacio());
        return porPeriodo.get(id)!;
    };

    for (const d of detalles) {
        const e = emp(d.empleadoid, `${d.empleados.nombre} ${d.empleados.apellidos}`, d.empleados.cargo);
        const p = per(d.periodoid);
        const otros = num(d.comisiones) + num(d.pagoferiados) + num(d.otrosingresos);
        for (const a of [e.acum, p]) {
            a.salario += num(d.salariobruto); a.horasExtra += num(d.montohorasextra); a.otrosIngresos += otros; a.inssPatronal += num(d.insspatronal);
        }
    }
    const provision = (empleadoid: number, periodoid: number, monto: number) => {
        emp(empleadoid).acum.provisiones += monto;
        per(periodoid).provisiones += monto;
    };
    for (const v of vac) provision(v.empleadoid, v.periodoid, v.montoganado != null ? num(v.montoganado) : num(v.diasganados) * num(v.valordiasalario));
    for (const d of dec) provision(d.empleadoid, d.periodoid, num(d.montoacumulado));
    for (const i of ind) provision(i.empleadoid, i.periodoid, num(i.montoacumulado));

    // Empleados que solo tienen provisión (sin planilla en el rango) necesitan nombre.
    const sinNombre = [...porEmpleado.entries()].filter(([, e]) => !e.nombre).map(([id]) => id);
    if (sinNombre.length) {
        const faltantes = await prisma.empleados.findMany({ where: { empleadoid: { in: sinNombre } }, select: { empleadoid: true, nombre: true, apellidos: true, cargo: true } });
        for (const f of faltantes) { const e = porEmpleado.get(f.empleadoid)!; e.nombre = `${f.nombre} ${f.apellidos}`; e.cargo = f.cargo; }
    }

    const total = [...porEmpleado.values()].reduce((t, e) => {
        t.salario += e.acum.salario; t.horasExtra += e.acum.horasExtra; t.otrosIngresos += e.acum.otrosIngresos; t.inssPatronal += e.acum.inssPatronal; t.provisiones += e.acum.provisiones;
        return t;
    }, vacio());

    return {
        totales: { empleados: porEmpleado.size, ...redondear(total) },
        porPeriodo: periodos.map(p => ({ periodoid: p.periodoid, tipoperiodo: p.tipoperiodo, fechainicio: p.fechainicio, fechafin: p.fechafin, estado: p.estado, ...redondear(porPeriodo.get(p.periodoid) ?? vacio()) })),
        porEmpleado: [...porEmpleado.entries()].map(([empleadoid, e]) => ({ empleadoid, nombre: e.nombre, cargo: e.cargo, ...redondear(e.acum) })).sort((a, b) => b.costoTotal - a.costoTotal),
    };
}

// ─── Pasivo laboral: lo acumulado y aún no pagado a cada empleado ───────
// Vacaciones y décimo tercer mes registran lo pagado en su acumulado y también como
// "pago de beneficio"; se toma el mayor de ambos para no restarlo dos veces.
export async function pasivoLaboral() {
    const [empleados, vac, dec, ind, pagos] = await Promise.all([
        prisma.empleados.findMany({ select: { empleadoid: true, nombre: true, apellidos: true, cargo: true, estado: true } }),
        prisma.acumuladovacaciones.findMany(),
        prisma.acumuladodecimoprimermes.findMany(),
        prisma.acumuladoindemnizacion.findMany(),
        prisma.pagosbeneficios.findMany(),
    ]);

    const filas = empleados.map(e => {
        const mias = <T extends { empleadoid: number }>(lista: T[]) => lista.filter(x => x.empleadoid === e.empleadoid);
        const pagado = (tipo: string) => mias(pagos).filter(p => p.tipobeneficio === tipo).reduce((s, p) => s + num(p.montopagado), 0);

        const vacs = mias(vac);
        const vacGanado = vacs.reduce((s, v) => s + (v.montoganado != null ? num(v.montoganado) : num(v.diasganados) * num(v.valordiasalario)), 0);
        const vacPagado = Math.max(vacs.reduce((s, v) => s + num(v.montopagado), 0), pagado('VACACIONES'));
        const diasGanados = vacs.reduce((s, v) => s + num(v.diasganados), 0);
        const diasDisfrutados = vacs.reduce((s, v) => s + num(v.diasdisfrutados), 0);

        const decs = mias(dec);
        const decAcum = decs.reduce((s, d) => s + num(d.montoacumulado), 0);
        const decPagado = Math.max(decs.reduce((s, d) => s + num(d.montopagado), 0), pagado('DECIMO_TERCER_MES'));

        const indAcum = mias(ind).reduce((s, i) => s + num(i.montoacumulado), 0);
        const indPagado = pagado('INDEMNIZACION');

        const vacaciones = Math.max(0, vacGanado - vacPagado);
        const decimo = Math.max(0, decAcum - decPagado);
        const indemnizacion = Math.max(0, indAcum - indPagado);
        return {
            empleadoid: e.empleadoid,
            nombre: `${e.nombre} ${e.apellidos}`,
            cargo: e.cargo,
            activo: e.estado,
            diasVacacionesPendientes: r2(Math.max(0, diasGanados - diasDisfrutados)),
            vacaciones: r2(vacaciones),
            decimoTercerMes: r2(decimo),
            indemnizacion: r2(indemnizacion),
            total: r2(vacaciones + decimo + indemnizacion),
        };
    }).filter(f => f.total > 0 || f.activo).sort((a, b) => b.total - a.total);

    const suma = (campo: 'vacaciones' | 'decimoTercerMes' | 'indemnizacion' | 'total') => r2(filas.reduce((s, f) => s + f[campo], 0));
    return {
        totales: { empleados: filas.length, vacaciones: suma('vacaciones'), decimoTercerMes: suma('decimoTercerMes'), indemnizacion: suma('indemnizacion'), total: suma('total') },
        empleados: filas,
    };
}
