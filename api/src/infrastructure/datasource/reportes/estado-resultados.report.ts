import prisma from "../../../data/postgres";
import { num, r2, periodoAnterior, VENTA_VALIDA } from "./helpers";
import type { Rango } from "./helpers";

const NOMBRE_RETIROS = 'Retiros de Efectivo';
const ESTADOS_PLANILLA_DEVENGADA = ['APROBADO', 'PAGADO', 'CERRADO'];

export interface LineaGasto {
    categoria: string;
    monto: number;
}

export interface EstadoResultados {
    ventasBrutas: number;
    devoluciones: number;
    ventasNetas: number;
    costoVentas: number;
    utilidadBruta: number;
    margenBruto: number;
    gastosOperativos: LineaGasto[];
    totalGastosOperativos: number;
    nomina: {
        sueldos: number;
        horasExtra: number;
        otrosIngresos: number;
        inssPatronal: number;
        total: number;
    };
    provisiones: {
        vacaciones: number;
        decimoTercerMes: number;
        indemnizacion: number;
        total: number;
    };
    mermas: number;
    utilidadOperativa: number;
    margenOperativo: number;
}

// Estado de resultados de un período (base devengada para ventas, costo, nómina y provisiones;
// base de pago para los gastos operativos).
async function calcular(r: Rango): Promise<EstadoResultados> {
    const fechaVenta = { gte: r.inicio, lte: r.fin };

    const [ventas, devoluciones, lineas, pagos, mermas, periodos, vac, dec, ind] = await Promise.all([
        prisma.ventas.aggregate({ _sum: { total: true }, where: { ...VENTA_VALIDA, fecha: fechaVenta } }),
        prisma.devoluciones.findMany({
            where: { fecha: fechaVenta },
            include: { ventaproductos: { include: { productos: { select: { preciocompra: true } } } } },
        }),
        prisma.ventaproductos.findMany({
            where: { ventas: { ...VENTA_VALIDA, fecha: fechaVenta } },
            select: { cantidad: true, productos: { select: { preciocompra: true } } },
        }),
        prisma.pagos.findMany({
            where: {
                fecha: fechaVenta,
                pagocuentasporpagar: { none: {} },
                devoluciones: { none: {} },
            },
            select: { monto: true, pagogastos: { select: { gastos: { select: { nombre: true } } } } },
        }),
        prisma.mermas.findMany({
            where: { fecha: fechaVenta },
            include: { productodestino: { select: { preciocompra: true } } },
        }),
        prisma.periodosplanilla.findMany({
            where: { fechafin: { gte: r.inicio, lte: r.fin }, estado: { in: ESTADOS_PLANILLA_DEVENGADA } },
            select: { periodoid: true },
        }),
        prisma.acumuladovacaciones.findMany({ where: { fechageneracion: { gte: r.inicio, lte: r.fin } }, select: { diasganados: true, valordiasalario: true, montoganado: true } }),
        prisma.acumuladodecimoprimermes.aggregate({ _sum: { montoacumulado: true }, where: { fechageneracion: { gte: r.inicio, lte: r.fin } } }),
        prisma.acumuladoindemnizacion.aggregate({ _sum: { montoacumulado: true }, where: { fechageneracion: { gte: r.inicio, lte: r.fin } } }),
    ]);

    const ventasBrutas = r2(num(ventas._sum.total));
    const devuelto = r2(devoluciones.reduce((s, d) => s + num(d.montodevuelto), 0));
    const costoDevuelto = devoluciones.reduce((s, d) => s + num(d.cantidad) * num(d.ventaproductos.productos.preciocompra), 0);
    const ventasNetas = r2(ventasBrutas - devuelto);
    const costoVentas = r2(lineas.reduce((s, l) => s + num(l.cantidad) * num(l.productos.preciocompra), 0) - costoDevuelto);
    const utilidadBruta = r2(ventasNetas - costoVentas);

    // Gastos operativos por categoría (gasto al que se imputó el pago); sin retiros de efectivo.
    const porCategoria = new Map<string, number>();
    for (const p of pagos) {
        const nombres = p.pagogastos.map(pg => pg.gastos.nombre);
        if (nombres.some(n => n.toLowerCase() === NOMBRE_RETIROS.toLowerCase())) continue;
        const categoria = nombres[0] ?? 'Sin categoría';
        porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + num(p.monto));
    }
    const gastosOperativos = [...porCategoria.entries()]
        .map(([categoria, monto]) => ({ categoria, monto: r2(monto) }))
        .sort((a, b) => b.monto - a.monto);
    const totalGastosOperativos = r2(gastosOperativos.reduce((s, g) => s + g.monto, 0));

    // Nómina devengada: planillas aprobadas/pagadas/cerradas cuyo período termina en el rango.
    const periodoIds = periodos.map(p => p.periodoid);
    const detalles = periodoIds.length
        ? await prisma.planilladetalle.aggregate({
            _sum: { salariobruto: true, montohorasextra: true, comisiones: true, pagoferiados: true, otrosingresos: true, insspatronal: true },
            where: { periodoid: { in: periodoIds } },
        })
        : null;
    const s = detalles?._sum;
    const sueldos = r2(num(s?.salariobruto));
    const horasExtra = r2(num(s?.montohorasextra));
    const otrosIngresos = r2(num(s?.comisiones) + num(s?.pagoferiados) + num(s?.otrosingresos));
    const inssPatronal = r2(num(s?.insspatronal));
    const totalNomina = r2(sueldos + horasExtra + otrosIngresos + inssPatronal);

    // Provisiones laborales generadas en el rango.
    const vacaciones = r2(vac.reduce((acc, v) => acc + (v.montoganado != null ? num(v.montoganado) : num(v.diasganados) * num(v.valordiasalario)), 0));
    const decimo = r2(num(dec._sum.montoacumulado));
    const indemnizacion = r2(num(ind._sum.montoacumulado));
    const totalProvisiones = r2(vacaciones + decimo + indemnizacion);

    // Mermas: pérdida a costo, menos el valor recuperado cuando se convirtieron en otro producto.
    const totalMermas = r2(mermas.reduce((acc, m) => {
        const recuperado = m.productodestinoid != null ? num(m.cantidaddestino) * num(m.productodestino?.preciocompra) : 0;
        return acc + Math.max(0, num(m.costoperdida) - recuperado);
    }, 0));

    const utilidadOperativa = r2(utilidadBruta - totalGastosOperativos - totalNomina - totalProvisiones - totalMermas);

    return {
        ventasBrutas,
        devoluciones: devuelto,
        ventasNetas,
        costoVentas,
        utilidadBruta,
        margenBruto: ventasNetas > 0 ? r2((utilidadBruta / ventasNetas) * 100) : 0,
        gastosOperativos,
        totalGastosOperativos,
        nomina: { sueldos, horasExtra, otrosIngresos, inssPatronal, total: totalNomina },
        provisiones: { vacaciones, decimoTercerMes: decimo, indemnizacion, total: totalProvisiones },
        mermas: totalMermas,
        utilidadOperativa,
        margenOperativo: ventasNetas > 0 ? r2((utilidadOperativa / ventasNetas) * 100) : 0,
    };
}

export async function estadoResultados(r: Rango) {
    const anteriorRango = periodoAnterior(r);
    const [actual, anterior] = await Promise.all([calcular(r), calcular(anteriorRango)]);
    return {
        periodo: { inicio: r.inicio, fin: r.fin },
        periodoAnterior: { inicio: anteriorRango.inicio, fin: anteriorRango.fin },
        actual,
        anterior,
    };
}
