import prisma from "../../../data/postgres";
import { VENTA_VALIDA, hoyLocal, num, r2 } from "./helpers";
import type { Rango } from "./helpers";

const DIA_MS = 86400000;

// ─── Productos por vencer / vencidos ────────────────────────────────────
export async function productosPorVencer(dias: number) {
    const hoy = Date.parse(hoyLocal());
    const productos = await prisma.productos.findMany({
        where: { requierefechavencimiento: true, fechavencimiento: { not: null }, stockactual: { gt: 0 } },
        include: { categoriasproductos: { select: { nombre: true } } },
    });

    const tramoDe = (d: number) => (d < 0 ? 'VENCIDO' : d <= 7 ? '0-7' : d <= 15 ? '8-15' : d <= 30 ? '16-30' : '31+');
    const filas = productos
        .map(p => {
            const diasRestantes = Math.round((Date.parse(p.fechavencimiento!.toISOString().slice(0, 10)) - hoy) / DIA_MS);
            const stock = num(p.stockactual);
            return {
                productoid: p.productoid,
                nombre: p.nombre,
                categoria: p.categoriasproductos?.nombre ?? 'Sin categoría',
                fechavencimiento: p.fechavencimiento!.toISOString().slice(0, 10),
                diasRestantes,
                tramo: tramoDe(diasRestantes),
                stock,
                valorCosto: r2(stock * num(p.preciocompra)),
                valorVenta: r2(stock * num(p.precioventa)),
            };
        })
        .filter(f => f.diasRestantes <= dias)
        .sort((a, b) => a.diasRestantes - b.diasRestantes);

    const tramos = ['VENCIDO', '0-7', '8-15', '16-30', '31+'].map(t => {
        const items = filas.filter(f => f.tramo === t);
        return { tramo: t, productos: items.length, unidades: r2(items.reduce((s, f) => s + f.stock, 0)), valorCosto: r2(items.reduce((s, f) => s + f.valorCosto, 0)) };
    });

    return {
        dias,
        resumen: {
            vencidos: filas.filter(f => f.tramo === 'VENCIDO').length,
            porVencer: filas.filter(f => f.tramo !== 'VENCIDO').length,
            valorEnRiesgo: r2(filas.reduce((s, f) => s + f.valorCosto, 0)),
        },
        tramos,
        productos: filas,
    };
}

// ─── Valorización de inventario, rotación y clasificación ABC ───────────
export async function valorizacionInventario(dias: number) {
    const desde = new Date(Date.now() - dias * DIA_MS);

    const [productos, ventas] = await Promise.all([
        prisma.productos.findMany({ include: { categoriasproductos: { include: { padre: true } } } }),
        prisma.ventaproductos.groupBy({
            by: ['productoid'],
            _sum: { cantidad: true, totalproducto: true },
            where: { ventas: { ...VENTA_VALIDA, fecha: { gte: desde } } },
        }),
    ]);

    const vendido = new Map(ventas.map(v => [v.productoid, { cantidad: num(v._sum.cantidad), valor: num(v._sum.totalproducto) }]));

    const filas = productos.map(p => {
        const stock = num(p.stockactual);
        const v = vendido.get(p.productoid) ?? { cantidad: 0, valor: 0 };
        const cat = p.categoriasproductos;
        return {
            productoid: p.productoid,
            nombre: p.nombre,
            categoria: cat ? (cat.padre?.nombre ?? cat.nombre) : 'Sin categoría',
            stock,
            costoUnitario: num(p.preciocompra),
            valorCosto: r2(stock * num(p.preciocompra)),
            valorVenta: r2(stock * num(p.precioventa)),
            vendidas: r2(v.cantidad),
            ventasValor: r2(v.valor),
            // Veces que se vendió el stock actual en el período
            rotacion: stock > 0 && v.cantidad > 0 ? r2(v.cantidad / stock) : null,
            diasInventario: stock > 0 && v.cantidad > 0 ? Math.round(stock / (v.cantidad / dias)) : null,
            abc: 'SIN_VENTAS' as 'A' | 'B' | 'C' | 'SIN_VENTAS',
        };
    });

    // Clasificación ABC por valor vendido: A = primeros 80 %, B = siguiente 15 %, C = resto.
    const conVentas = filas.filter(f => f.ventasValor > 0).sort((a, b) => b.ventasValor - a.ventasValor);
    const totalVentas = conVentas.reduce((s, f) => s + f.ventasValor, 0);
    let acumulado = 0;
    for (const f of conVentas) {
        acumulado += f.ventasValor;
        const pct = (acumulado / totalVentas) * 100;
        f.abc = pct - (f.ventasValor / totalVentas) * 100 < 80 ? 'A' : pct - (f.ventasValor / totalVentas) * 100 < 95 ? 'B' : 'C';
    }

    const categorias = new Map<string, { productos: number; unidades: number; valorCosto: number; valorVenta: number }>();
    for (const f of filas) {
        const c = categorias.get(f.categoria) ?? { productos: 0, unidades: 0, valorCosto: 0, valorVenta: 0 };
        c.productos++; c.unidades += f.stock; c.valorCosto += f.valorCosto; c.valorVenta += f.valorVenta;
        categorias.set(f.categoria, c);
    }
    const valorCosto = filas.reduce((s, f) => s + f.valorCosto, 0);
    const valorVenta = filas.reduce((s, f) => s + f.valorVenta, 0);

    return {
        dias,
        resumen: { productos: filas.length, unidades: r2(filas.reduce((s, f) => s + f.stock, 0)), valorCosto: r2(valorCosto), valorVenta: r2(valorVenta), utilidadPotencial: r2(valorVenta - valorCosto) },
        porCategoria: [...categorias.entries()].map(([categoria, c]) => ({
            categoria, productos: c.productos, unidades: r2(c.unidades), valorCosto: r2(c.valorCosto), valorVenta: r2(c.valorVenta),
            utilidadPotencial: r2(c.valorVenta - c.valorCosto),
            participacion: valorCosto > 0 ? r2((c.valorCosto / valorCosto) * 100) : 0,
        })).sort((a, b) => b.valorCosto - a.valorCosto),
        abc: (['A', 'B', 'C', 'SIN_VENTAS'] as const).map(clase => ({
            clase,
            productos: filas.filter(f => f.abc === clase).length,
            valorCosto: r2(filas.filter(f => f.abc === clase).reduce((s, f) => s + f.valorCosto, 0)),
        })),
        productos: filas.sort((a, b) => b.valorCosto - a.valorCosto),
    };
}

// ─── Inventario sin movimiento (capital detenido) ───────────────────────
export async function inventarioSinMovimiento(dias: number) {
    const filas: any[] = await prisma.$queryRawUnsafe(`
        SELECT p.productoid, p.nombre, COALESCE(pc.nombre, c.nombre) AS categoria,
               p.stockactual, p.preciocompra, p.precioventa,
               (SELECT MAX(v.fecha) FROM ventaproductos vp JOIN ventas v ON v.ventaid = vp.ventaid
                 WHERE vp.productoid = p.productoid AND v.estado = true AND v.tipoventa <> 'COTIZACION') AS ultimaventa,
               (SELECT MAX(co.fecha) FROM comprasproductos cp JOIN compras co ON co.compraid = cp.compraid
                 WHERE cp.productoid = p.productoid AND co.estado = true) AS ultimacompra
          FROM productos p
          LEFT JOIN categoriasproductos c ON c.categoriaid = p.categoriaid
          LEFT JOIN categoriasproductos pc ON pc.categoriaid = c.categoriapadreid
         WHERE p.stockactual > 0
    `);

    const ahora = Date.now();
    const limite = ahora - dias * DIA_MS;
    const productos = filas
        .filter(f => !f.ultimaventa || new Date(f.ultimaventa).getTime() < limite)
        .map(f => {
            const stock = num(f.stockactual);
            return {
                productoid: f.productoid,
                nombre: f.nombre,
                categoria: f.categoria ?? 'Sin categoría',
                stock,
                valorCosto: r2(stock * num(f.preciocompra)),
                valorVenta: r2(stock * num(f.precioventa)),
                ultimaVenta: f.ultimaventa ?? null,
                ultimaCompra: f.ultimacompra ?? null,
                diasSinVenta: f.ultimaventa ? Math.floor((ahora - new Date(f.ultimaventa).getTime()) / DIA_MS) : null,
            };
        })
        .sort((a, b) => b.valorCosto - a.valorCosto);

    const valorTotal = filas.reduce((s, f) => s + num(f.stockactual) * num(f.preciocompra), 0);
    const capital = productos.reduce((s, p) => s + p.valorCosto, 0);
    return {
        dias,
        resumen: {
            productos: productos.length,
            nuncaVendidos: productos.filter(p => p.diasSinVenta == null).length,
            capitalDetenido: r2(capital),
            porcentajeInventario: valorTotal > 0 ? r2((capital / valorTotal) * 100) : 0,
        },
        productos,
    };
}

// ─── Mermas y pérdidas ──────────────────────────────────────────────────
export async function reporteMermas(r: Rango) {
    const mermas = await prisma.mermas.findMany({
        where: { fecha: { gte: r.inicio, lte: r.fin } },
        include: { productos: { select: { nombre: true } }, productodestino: { select: { nombre: true, preciocompra: true } }, usuarios: { select: { nombreusuario: true } } },
        orderBy: { fecha: 'desc' },
    });

    const detalle = mermas.map(m => {
        const recuperado = m.productodestinoid != null ? num(m.cantidaddestino) * num(m.productodestino?.preciocompra) : 0;
        const perdida = num(m.costoperdida);
        return {
            id: m.mermaid, fecha: m.fecha, producto: m.productos.nombre, cantidad: num(m.cantidad), costoUnitario: num(m.costounitario),
            perdida: r2(perdida), recuperado: r2(recuperado), neto: r2(Math.max(0, perdida - recuperado)),
            convertidoA: m.productodestino?.nombre ?? null, motivo: m.motivo, usuario: m.usuarios.nombreusuario,
        };
    });

    const agrupar = (clave: (d: (typeof detalle)[number]) => string) => {
        const mapa = new Map<string, { veces: number; unidades: number; neto: number }>();
        for (const d of detalle) {
            const k = clave(d);
            const x = mapa.get(k) ?? { veces: 0, unidades: 0, neto: 0 };
            x.veces++; x.unidades += d.cantidad; x.neto += d.neto;
            mapa.set(k, x);
        }
        return [...mapa.entries()].map(([nombre, x]) => ({ nombre, veces: x.veces, unidades: r2(x.unidades), neto: r2(x.neto) })).sort((a, b) => b.neto - a.neto);
    };

    return {
        resumen: {
            registros: detalle.length,
            perdidaBruta: r2(detalle.reduce((s, d) => s + d.perdida, 0)),
            recuperado: r2(detalle.reduce((s, d) => s + d.recuperado, 0)),
            perdidaNeta: r2(detalle.reduce((s, d) => s + d.neto, 0)),
        },
        porProducto: agrupar(d => d.producto),
        porMotivo: agrupar(d => d.motivo.trim().toLowerCase()),
        porUsuario: agrupar(d => d.usuario),
        detalle,
    };
}
