import prisma from "../../../data/postgres";
import { METODOS, VENTA_VALIDA, diaLocal, mesLocal, normalizarMetodo, num, r2 } from "./helpers";
import type { MetodoCaja, Rango } from "./helpers";
import { NOTA_CREDITO } from "../helpers/devolucion.helper";

// ─── Flujo de caja por método de pago ───────────────────────────────────
type Celda = {
    entradasVentas: number; entradasAbonos: number;
    salidasCompras: number; salidasPagos: number; salidasReembolsos: number;
};
const celdaVacia = (): Celda => ({ entradasVentas: 0, entradasAbonos: 0, salidasCompras: 0, salidasPagos: 0, salidasReembolsos: 0 });
const tablaVacia = (): Record<MetodoCaja, Celda> => ({ EFECTIVO: celdaVacia(), BAC: celdaVacia(), LAFISE: celdaVacia(), TARJETA: celdaVacia(), OTRO: celdaVacia() });

const entradas = (c: Celda) => c.entradasVentas + c.entradasAbonos;
const salidas = (c: Celda) => c.salidasCompras + c.salidasPagos + c.salidasReembolsos;
const redondear = (c: Celda) => ({
    entradasVentas: r2(c.entradasVentas), entradasAbonos: r2(c.entradasAbonos),
    salidasCompras: r2(c.salidasCompras), salidasPagos: r2(c.salidasPagos), salidasReembolsos: r2(c.salidasReembolsos),
    entradas: r2(entradas(c)), salidas: r2(salidas(c)), neto: r2(entradas(c) - salidas(c)),
});

export async function flujoCaja(r: Rango, agrupar: 'dia' | 'mes') {
    const fecha = { gte: r.inicio, lte: r.fin };

    const [ventas, abonos, compras, pagos] = await Promise.all([
        prisma.ventas.findMany({
            where: { ...VENTA_VALIDA, fecha },
            select: { fecha: true, total: true, tipoventa: true, ventapagos: { select: { metodopago: true, banco: true, monto: true } } },
        }),
        prisma.abonos.findMany({
            where: { fecha, cuentasporcobrar: { estado: { not: 'ANULADA' } }, metodopago: { not: NOTA_CREDITO } },
            select: { fecha: true, monto: true, metodopago: true },
        }),
        prisma.compras.findMany({
            where: { fecha, estado: true, tipocompra: { equals: 'CONTADO', mode: 'insensitive' } },
            select: { fecha: true, total: true, metodopago: true },
        }),
        prisma.pagos.findMany({
            where: { fecha },
            select: { fecha: true, monto: true, metodopago: true, devoluciones: { select: { banco: true, metodopago: true }, take: 1 } },
        }),
    ]);

    const clave = (d: Date) => (agrupar === 'mes' ? mesLocal(d) : diaLocal(d));
    const periodos = new Map<string, Record<MetodoCaja, Celda>>();
    const totales = tablaVacia();
    const sumar = (d: Date | null, metodo: MetodoCaja, campo: keyof Celda, monto: number) => {
        if (!d) return;
        const k = clave(d);
        if (!periodos.has(k)) periodos.set(k, tablaVacia());
        periodos.get(k)![metodo][campo] += monto;
        totales[metodo][campo] += monto;
    };

    for (const v of ventas) {
        // Una venta a crédito no es dinero cobrado: su cobro llega después como abonos.
        if (v.tipoventa === 'CREDITO') continue;
        if (v.ventapagos.length > 0) {
            for (const p of v.ventapagos) sumar(v.fecha, normalizarMetodo(p.banco || p.metodopago), 'entradasVentas', num(p.monto));
        } else {
            // Venta de contado sin desglose de pagos: se asume efectivo.
            sumar(v.fecha, 'EFECTIVO', 'entradasVentas', num(v.total));
        }
    }
    for (const a of abonos) sumar(a.fecha, normalizarMetodo(a.metodopago), 'entradasAbonos', num(a.monto));
    for (const c of compras) sumar(c.fecha, normalizarMetodo(c.metodopago), 'salidasCompras', num(c.total));
    for (const p of pagos) {
        const dev = p.devoluciones[0];
        if (dev) sumar(p.fecha, normalizarMetodo(dev.banco || dev.metodopago || p.metodopago), 'salidasReembolsos', num(p.monto));
        else sumar(p.fecha, normalizarMetodo(p.metodopago), 'salidasPagos', num(p.monto));
    }

    const sumaTotal = METODOS.reduce((acc, m) => {
        const c = totales[m];
        return { entradas: acc.entradas + entradas(c), salidas: acc.salidas + salidas(c) };
    }, { entradas: 0, salidas: 0 });

    return {
        agrupar,
        totales: { entradas: r2(sumaTotal.entradas), salidas: r2(sumaTotal.salidas), neto: r2(sumaTotal.entradas - sumaTotal.salidas) },
        metodos: METODOS.map(m => ({ metodo: m, ...redondear(totales[m]) })),
        periodos: [...periodos.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([periodo, t]) => {
            const total = METODOS.reduce((acc, m) => ({ e: acc.e + entradas(t[m]), s: acc.s + salidas(t[m]) }), { e: 0, s: 0 });
            return {
                periodo,
                entradas: r2(total.e), salidas: r2(total.s), neto: r2(total.e - total.s),
                metodos: Object.fromEntries(METODOS.map(m => [m, redondear(t[m])])),
            };
        }),
    };
}

// ─── Antigüedad de saldos (CxC / CxP) ───────────────────────────────────
type Tramo = 'vigente' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90mas';
const TRAMOS: Tramo[] = ['vigente', 'd1_30', 'd31_60', 'd61_90', 'd90mas'];
const tramoDe = (dias: number): Tramo => (dias <= 0 ? 'vigente' : dias <= 30 ? 'd1_30' : dias <= 60 ? 'd31_60' : dias <= 90 ? 'd61_90' : 'd90mas');
const tramosVacios = (): Record<Tramo, number> => ({ vigente: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90mas: 0 });

export async function antiguedadSaldos(tipo: 'cxc' | 'cxp', corte: string) {
    interface Cuenta { id: number; nombre: string; telefono: string | null; referencia: string; vencimiento: string; saldo: number }
    const cuentas: Cuenta[] = [];

    if (tipo === 'cxc') {
        const registros = await prisma.cuentasporcobrar.findMany({
            where: { estado: { notIn: ['ANULADA', 'PAGADO'] } },
            include: { clientes: { select: { nombre: true, telefono: true } } },
        });
        for (const c of registros) {
            cuentas.push({ id: c.cuentaid, nombre: c.clientes.nombre, telefono: c.clientes.telefono, referencia: `Venta #${c.ventaid}`, vencimiento: c.fechavencimiento.toISOString().slice(0, 10), saldo: num(c.montototal) - num(c.montopagado) });
        }
    } else {
        const registros = await prisma.cuentasporpagar.findMany({
            where: { estado: { notIn: ['ANULADA', 'PAGADO'] } },
            include: { compras: { select: { facturaproveedor: true, proveedores: { select: { nombreempresa: true, telefono: true } } } } },
        });
        for (const c of registros) {
            cuentas.push({ id: c.cuentapagarid, nombre: c.compras.proveedores.nombreempresa, telefono: c.compras.proveedores.telefono ?? null, referencia: c.compras.facturaproveedor ? `Compra #${c.compraid} (Fact. ${c.compras.facturaproveedor})` : `Compra #${c.compraid}`, vencimiento: c.fechavencimiento.toISOString().slice(0, 10), saldo: num(c.montototal) - num(c.montopagado) });
        }
    }

    const base = Date.parse(corte);
    const detalle = cuentas
        .filter(c => c.saldo > 0.005)
        .map(c => {
            const dias = Math.round((base - Date.parse(c.vencimiento)) / 86400000);
            return { ...c, saldo: r2(c.saldo), dias, tramo: tramoDe(dias) };
        })
        .sort((a, b) => b.dias - a.dias);

    const totales = tramosVacios();
    const porNombre = new Map<string, { nombre: string; telefono: string | null; tramos: Record<Tramo, number>; cuentas: number; maxDias: number }>();
    for (const d of detalle) {
        totales[d.tramo] += d.saldo;
        const g = porNombre.get(d.nombre) ?? { nombre: d.nombre, telefono: d.telefono, tramos: tramosVacios(), cuentas: 0, maxDias: -Infinity };
        g.tramos[d.tramo] += d.saldo; g.cuentas++; g.maxDias = Math.max(g.maxDias, d.dias);
        porNombre.set(d.nombre, g);
    }
    const total = TRAMOS.reduce((s, t) => s + totales[t], 0);

    return {
        tipo,
        fechaCorte: corte,
        totales: { ...Object.fromEntries(TRAMOS.map(t => [t, r2(totales[t])])), total: r2(total) },
        filas: [...porNombre.values()].map(g => ({
            nombre: g.nombre, telefono: g.telefono, cuentas: g.cuentas, maxDias: g.maxDias,
            ...Object.fromEntries(TRAMOS.map(t => [t, r2(g.tramos[t])])),
            total: r2(TRAMOS.reduce((s, t) => s + g.tramos[t], 0)),
        })).sort((a, b) => b.total - a.total),
        detalle,
    };
}
