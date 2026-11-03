import prisma from "../../../data/postgres";
import { DIAS_SEMANA, VENTA_VALIDA, aLocal, diaLocal, num, r2 } from "./helpers";
import type { Rango } from "./helpers";

// ─── Libro de ventas ────────────────────────────────────────────────────
type Comprobante = 'FISCAL' | 'NO_FISCAL' | 'SIN_COMPROBANTE';

/** Números que faltan en una serie de consecutivos (ej. F000010, F000013 -> 11 y 12). */
function faltantes(consecutivos: string[], prefijo: string): string[] {
    const numeros = consecutivos
        .map(c => Number(c.replace(/\D/g, '')))
        .filter(n => Number.isInteger(n))
        .sort((a, b) => a - b);
    if (numeros.length < 2) return [];
    const presentes = new Set(numeros);
    const resultado: string[] = [];
    for (let n = numeros[0]; n <= numeros[numeros.length - 1] && resultado.length < 200; n++) {
        if (!presentes.has(n)) resultado.push(`${prefijo}${String(n).padStart(6, '0')}`);
    }
    return resultado;
}

export async function libroVentas(r: Rango) {
    const ventas = await prisma.ventas.findMany({
        where: { fecha: { gte: r.inicio, lte: r.fin }, tipoventa: { not: 'COTIZACION' } },
        include: { clientes: { select: { nombre: true, cedula: true, ruc: true } } },
        orderBy: [{ fecha: 'asc' }, { ventaid: 'asc' }],
    });

    const filas = ventas.map(v => {
        const comprobante: Comprobante = v.consecutivofiscal ? 'FISCAL' : v.consecutivonofiscal ? 'NO_FISCAL' : 'SIN_COMPROBANTE';
        return {
            ventaid: v.ventaid,
            fecha: v.fecha,
            comprobante,
            consecutivo: v.consecutivofiscal ?? v.consecutivonofiscal ?? null,
            cliente: v.clientes?.nombre ?? 'Público General',
            identificacion: v.clientes?.ruc ?? v.clientes?.cedula ?? null,
            tipoventa: v.tipoventa,
            descuento: r2(num(v.descuentofactura)),
            total: r2(num(v.total)),
            anulada: !v.estado,
        };
    });

    const vigentes = filas.filter(f => !f.anulada);
    const suma = (tipo: Comprobante) => r2(vigentes.filter(f => f.comprobante === tipo).reduce((s, f) => s + f.total, 0));
    const cuenta = (tipo: Comprobante) => vigentes.filter(f => f.comprobante === tipo).length;

    return {
        filas,
        resumen: {
            fiscal: { cantidad: cuenta('FISCAL'), total: suma('FISCAL') },
            noFiscal: { cantidad: cuenta('NO_FISCAL'), total: suma('NO_FISCAL') },
            sinComprobante: { cantidad: cuenta('SIN_COMPROBANTE'), total: suma('SIN_COMPROBANTE') },
            anuladas: { cantidad: filas.filter(f => f.anulada).length, total: r2(filas.filter(f => f.anulada).reduce((s, f) => s + f.total, 0)) },
            totalVigente: r2(vigentes.reduce((s, f) => s + f.total, 0)),
        },
        faltantes: {
            fiscal: faltantes(filas.filter(f => f.comprobante === 'FISCAL').map(f => f.consecutivo!), 'F'),
            noFiscal: faltantes(filas.filter(f => f.comprobante === 'NO_FISCAL').map(f => f.consecutivo!), 'S'),
        },
    };
}

// ─── Ventas por día, hora y día de la semana ────────────────────────────
export async function ventasPorPeriodo(r: Rango) {
    const ventas = await prisma.ventas.findMany({
        where: { ...VENTA_VALIDA, fecha: { gte: r.inicio, lte: r.fin } },
        select: { fecha: true, total: true },
    });

    const dias = new Map<string, { ventas: number; total: number }>();
    const horas = Array.from({ length: 24 }, (_, h) => ({ hora: h, ventas: 0, total: 0 }));
    const semana = DIAS_SEMANA.map((nombre, i) => ({ dia: i, nombre, ventas: 0, total: 0 }));

    for (const v of ventas) {
        const total = num(v.total);
        const local = aLocal(v.fecha!);
        const d = diaLocal(v.fecha!);
        const dia = dias.get(d) ?? { ventas: 0, total: 0 };
        dia.ventas++; dia.total += total;
        dias.set(d, dia);
        horas[local.getUTCHours()].ventas++; horas[local.getUTCHours()].total += total;
        semana[local.getUTCDay()].ventas++; semana[local.getUTCDay()].total += total;
    }

    const porDia = [...dias.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, x]) => ({ fecha, ventas: x.ventas, total: r2(x.total) }));
    const total = ventas.reduce((s, v) => s + num(v.total), 0);
    const pico = [...horas].sort((a, b) => b.total - a.total)[0];

    return {
        resumen: {
            ventas: ventas.length,
            total: r2(total),
            ticketPromedio: ventas.length ? r2(total / ventas.length) : 0,
            mejorDia: porDia.length ? [...porDia].sort((a, b) => b.total - a.total)[0] : null,
            horaPico: pico && pico.ventas > 0 ? pico.hora : null,
        },
        porDia,
        porHora: horas.map(h => ({ ...h, total: r2(h.total) })),
        porDiaSemana: semana.map(s => ({ ...s, total: r2(s.total) })),
    };
}

// ─── Top clientes ───────────────────────────────────────────────────────
export async function topClientes(r: Rango, limite: number) {
    const [ventas, cuentas] = await Promise.all([
        prisma.ventas.findMany({
            where: { ...VENTA_VALIDA, fecha: { gte: r.inicio, lte: r.fin } },
            select: { clienteid: true, fecha: true, total: true, clientes: { select: { nombre: true, telefono: true } } },
            orderBy: { fecha: 'asc' },
        }),
        prisma.cuentasporcobrar.findMany({ where: { estado: { not: 'ANULADA' } }, select: { clienteid: true, montototal: true, montopagado: true } }),
    ]);

    const deuda = new Map<number, number>();
    for (const c of cuentas) deuda.set(c.clienteid, (deuda.get(c.clienteid) ?? 0) + Math.max(0, num(c.montototal) - num(c.montopagado)));

    const grupos = new Map<number | null, { nombre: string; telefono: string | null; fechas: Date[]; total: number }>();
    for (const v of ventas) {
        const g = grupos.get(v.clienteid) ?? { nombre: v.clientes?.nombre ?? 'Público General', telefono: v.clientes?.telefono ?? null, fechas: [], total: 0 };
        g.fechas.push(v.fecha!);
        g.total += num(v.total);
        grupos.set(v.clienteid, g);
    }

    const totalGeneral = ventas.reduce((s, v) => s + num(v.total), 0);
    const filas = [...grupos.entries()].map(([clienteid, g]) => {
        const compras = g.fechas.length;
        const primera = g.fechas[0].getTime();
        const ultima = g.fechas[compras - 1].getTime();
        return {
            clienteid,
            cliente: g.nombre,
            telefono: g.telefono,
            compras,
            total: r2(g.total),
            ticketPromedio: r2(g.total / compras),
            participacion: totalGeneral > 0 ? r2((g.total / totalGeneral) * 100) : 0,
            ultimaCompra: g.fechas[compras - 1],
            // Días promedio entre compras (solo con 2 o más)
            frecuenciaDias: compras > 1 ? r2((ultima - primera) / 86400000 / (compras - 1)) : null,
            deudaPendiente: clienteid != null ? r2(deuda.get(clienteid) ?? 0) : 0,
        };
    }).sort((a, b) => b.total - a.total);

    return { total: r2(totalGeneral), clientes: filas.slice(0, limite), totalClientes: filas.length };
}

// ─── Ventas por categoría, mayoreo contra detalle y por cajero ──────────
export async function ventasPorCategoria(r: Rango) {
    const fecha = { gte: r.inicio, lte: r.fin };

    const [lineas, devoluciones, ventas] = await Promise.all([
        prisma.ventaproductos.findMany({
            where: { ventas: { ...VENTA_VALIDA, fecha } },
            include: { productos: { include: { categoriasproductos: { include: { padre: true } } } } },
        }),
        prisma.devoluciones.findMany({
            where: { fecha },
            include: { usuarios: { select: { nombreusuario: true } }, ventaproductos: { include: { productos: { include: { categoriasproductos: { include: { padre: true } } } } } } },
        }),
        prisma.ventas.findMany({
            where: { ...VENTA_VALIDA, fecha },
            select: { ventaid: true, total: true, descuentofactura: true, sesiones: { select: { usuarioid: true, usuarios: { select: { nombreusuario: true } } } } },
        }),
    ]);

    // Una subcategoría se suma a su categoría principal (el padre) y se detalla debajo.
    const claveCategoria = (cat: { categoriaid: number; nombre: string; padre: { categoriaid: number; nombre: string } | null } | null) => {
        if (!cat) return { principalId: 0, principal: 'Sin categoría', sub: null as string | null };
        return cat.padre
            ? { principalId: cat.padre.categoriaid, principal: cat.padre.nombre, sub: cat.nombre }
            : { principalId: cat.categoriaid, principal: cat.nombre, sub: null };
    };

    interface Acum { cantidad: number; total: number; costo: number; devuelto: number }
    const vacio = (): Acum => ({ cantidad: 0, total: 0, costo: 0, devuelto: 0 });
    const principales = new Map<number, { nombre: string; acum: Acum; subs: Map<string, Acum> }>();
    const modalidad = { MAYOREO: { lineas: 0, ...vacio() }, DETALLE: { lineas: 0, ...vacio() } };

    const entrada = (id: number, nombre: string) => {
        if (!principales.has(id)) principales.set(id, { nombre, acum: vacio(), subs: new Map() });
        return principales.get(id)!;
    };

    for (const l of lineas) {
        const k = claveCategoria(l.productos.categoriasproductos);
        const p = entrada(k.principalId, k.principal);
        const cantidad = num(l.cantidad);
        const total = num(l.totalproducto);
        const costo = cantidad * num(l.productos.preciocompra);
        p.acum.cantidad += cantidad; p.acum.total += total; p.acum.costo += costo;
        if (k.sub) {
            const s = p.subs.get(k.sub) ?? vacio();
            s.cantidad += cantidad; s.total += total; s.costo += costo;
            p.subs.set(k.sub, s);
        }

        // Mayoreo: se vendió al precio de mayoreo del producto.
        const mayoreo = l.productos.preciomayoreo != null && num(l.preciounitario) <= num(l.productos.preciomayoreo) + 0.005;
        const m = modalidad[mayoreo ? 'MAYOREO' : 'DETALLE'];
        m.lineas++; m.cantidad += cantidad; m.total += total; m.costo += costo;
    }

    for (const d of devoluciones) {
        const k = claveCategoria(d.ventaproductos.productos.categoriasproductos);
        const p = entrada(k.principalId, k.principal);
        p.acum.devuelto += num(d.montodevuelto);
        if (k.sub) {
            const s = p.subs.get(k.sub) ?? vacio();
            s.devuelto += num(d.montodevuelto);
            p.subs.set(k.sub, s);
        }
    }

    const redondear = (a: Acum) => ({ cantidad: r2(a.cantidad), total: r2(a.total), costo: r2(a.costo), devuelto: r2(a.devuelto), neto: r2(a.total - a.devuelto), utilidad: r2(a.total - a.devuelto - a.costo) });
    const totalNeto = [...principales.values()].reduce((s, p) => s + p.acum.total - p.acum.devuelto, 0);

    const porCategoria = [...principales.values()]
        .map(p => ({
            categoria: p.nombre,
            ...redondear(p.acum),
            participacion: totalNeto > 0 ? r2(((p.acum.total - p.acum.devuelto) / totalNeto) * 100) : 0,
            subcategorias: [...p.subs.entries()].map(([nombre, a]) => ({ nombre, ...redondear(a) })).sort((a, b) => b.neto - a.neto),
        }))
        .sort((a, b) => b.neto - a.neto);

    // Por cajero (dueño de la sesión de caja en que se vendió)
    const cajeros = new Map<number, { cajero: string; ventas: number; total: number; descuentos: number; devoluciones: number; montoDevuelto: number }>();
    const cajero = (id: number, nombre: string) => {
        if (!cajeros.has(id)) cajeros.set(id, { cajero: nombre, ventas: 0, total: 0, descuentos: 0, devoluciones: 0, montoDevuelto: 0 });
        return cajeros.get(id)!;
    };
    for (const v of ventas) {
        const c = cajero(v.sesiones.usuarioid, v.sesiones.usuarios.nombreusuario);
        c.ventas++; c.total += num(v.total); c.descuentos += num(v.descuentofactura);
    }
    for (const d of devoluciones) {
        const c = cajero(d.usuarioid, d.usuarios.nombreusuario);
        c.devoluciones++; c.montoDevuelto += num(d.montodevuelto);
    }
    // Descuentos otorgados por línea
    const descuentosLinea = await prisma.ventaproductos.findMany({
        where: { descuento: { gt: 0 }, ventas: { ...VENTA_VALIDA, fecha } },
        select: { descuento: true, ventas: { select: { sesiones: { select: { usuarioid: true, usuarios: { select: { nombreusuario: true } } } } } } },
    });
    for (const l of descuentosLinea) {
        const s = l.ventas.sesiones;
        cajero(s.usuarioid, s.usuarios.nombreusuario).descuentos += num(l.descuento);
    }

    return {
        porCategoria,
        porModalidad: (['MAYOREO', 'DETALLE'] as const).map(k => ({ modalidad: k, lineas: modalidad[k].lineas, cantidad: r2(modalidad[k].cantidad), total: r2(modalidad[k].total), costo: r2(modalidad[k].costo), utilidad: r2(modalidad[k].total - modalidad[k].costo) })),
        porCajero: [...cajeros.values()].map(c => ({
            ...c,
            total: r2(c.total),
            descuentos: r2(c.descuentos),
            montoDevuelto: r2(c.montoDevuelto),
            ticketPromedio: c.ventas ? r2(c.total / c.ventas) : 0,
        })).sort((a, b) => b.total - a.total),
        totalNeto: r2(totalNeto),
    };
}

// ─── Devoluciones y cambios ─────────────────────────────────────────────
export async function reporteDevoluciones(r: Rango) {
    const fecha = { gte: r.inicio, lte: r.fin };
    const [devoluciones, ventas] = await Promise.all([
        prisma.devoluciones.findMany({
            where: { fecha },
            include: { usuarios: { select: { nombreusuario: true } }, ventaproductos: { include: { productos: { select: { nombre: true } } } } },
            orderBy: { fecha: 'desc' },
        }),
        prisma.ventas.aggregate({ _sum: { total: true }, where: { ...VENTA_VALIDA, fecha } }),
    ]);

    const agrupar = <K extends string>(clave: (d: (typeof devoluciones)[number]) => K) => {
        const mapa = new Map<K, { veces: number; unidades: number; monto: number }>();
        for (const d of devoluciones) {
            const k = clave(d);
            const x = mapa.get(k) ?? { veces: 0, unidades: 0, monto: 0 };
            x.veces++; x.unidades += num(d.cantidad); x.monto += num(d.montodevuelto);
            mapa.set(k, x);
        }
        return [...mapa.entries()].map(([nombre, x]) => ({ nombre, veces: x.veces, unidades: r2(x.unidades), monto: r2(x.monto) })).sort((a, b) => b.monto - a.monto);
    };

    const monto = devoluciones.reduce((s, d) => s + num(d.montodevuelto), 0);
    const ventasTotal = num(ventas._sum.total);

    return {
        resumen: {
            devoluciones: devoluciones.length,
            unidades: r2(devoluciones.reduce((s, d) => s + num(d.cantidad), 0)),
            monto: r2(monto),
            acreditado: r2(devoluciones.reduce((s, d) => s + num(d.montoacreditado), 0)),
            reembolsado: r2(devoluciones.reduce((s, d) => s + num(d.montoreembolsado), 0)),
            cambios: devoluciones.filter(d => d.tipo === 'CAMBIO').length,
            porcentajeVentas: ventasTotal > 0 ? r2((monto / ventasTotal) * 100) : 0,
        },
        porProducto: agrupar(d => d.ventaproductos.productos.nombre),
        porMotivo: agrupar(d => d.motivo.trim().toLowerCase()),
        porUsuario: agrupar(d => d.usuarios.nombreusuario),
        porTipo: agrupar(d => d.tipo),
        detalle: devoluciones.map(d => ({
            id: d.devolucionid,
            fecha: d.fecha,
            ventaid: d.ventaid,
            producto: d.ventaproductos.productos.nombre,
            cantidad: num(d.cantidad),
            monto: r2(num(d.montodevuelto)),
            tipo: d.tipo,
            metodopago: d.metodopago,
            acreditado: r2(num(d.montoacreditado)),
            reembolsado: r2(num(d.montoreembolsado)),
            motivo: d.motivo,
            usuario: d.usuarios.nombreusuario,
        })),
    };
}
