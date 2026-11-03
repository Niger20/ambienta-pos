import prisma from "../../../data/postgres";
import { num, r2 } from "./helpers";
import type { Rango } from "./helpers";

type Json = Record<string, unknown> | null;

// Columnas generadas o de poco valor al describir un cambio.
const IGNORAR = new Set(['utilidad', 'totalproducto', 'montorestante', 'stockresultante', 'totalingresos', 'totaldeducciones', 'salarioneto', 'totalbruto', 'totaldescuentos', 'montoneto', 'montoganado', 'montocuota']);

const cambios = (antes: Json, despues: Json) => {
    if (!antes || !despues) return [];
    return Object.keys(despues)
        .filter(k => !IGNORAR.has(k) && JSON.stringify(antes[k]) !== JSON.stringify(despues[k]))
        .map(campo => ({ campo, antes: antes[campo] ?? null, despues: despues[campo] ?? null }));
};

export interface FiltroBitacora {
    usuarioid?: number;
    tabla?: string;
    operacion?: string;
    limite: number;
}

// Bitácora de auditoría: quién cambió qué y ventas anuladas por usuario.
// El usuario queda registrado desde que el API informa `app.usuario_id` a la BD;
// los cambios anteriores a eso aparecen como "Sin usuario registrado".
export async function bitacoraAuditoria(r: Rango, f: FiltroBitacora) {
    const where = {
        fecha: { gte: r.inicio, lte: r.fin },
        ...(f.usuarioid ? { usuarioid: f.usuarioid } : {}),
        ...(f.tabla ? { tabla: f.tabla.toLowerCase() } : {}),
        ...(f.operacion ? { operacion: f.operacion.toUpperCase() } : {}),
    };

    const [registros, tablas] = await Promise.all([
        prisma.auditoria.findMany({ where, include: { usuarios: { select: { nombreusuario: true } } }, orderBy: { auditoriaid: 'desc' } }),
        prisma.auditoria.findMany({ where: { fecha: { gte: r.inicio, lte: r.fin } }, distinct: ['tabla'], select: { tabla: true } }),
    ]);

    const nombreUsuario = (x: (typeof registros)[number]) => x.usuarios?.nombreusuario ?? 'Sin usuario registrado';

    const eventos = registros.slice(0, f.limite).map(x => {
        const antes = x.datosanteriores as Json;
        const despues = x.datosnuevos as Json;
        const fila = despues ?? antes ?? {};
        const primeraClave = Object.keys(fila)[0];
        return {
            id: x.auditoriaid,
            fecha: x.fecha,
            usuarioid: x.usuarioid,
            usuario: nombreUsuario(x),
            tabla: x.tabla,
            operacion: x.operacion,
            registroid: primeraClave ? fila[primeraClave] : null,
            cambios: x.operacion === 'UPDATE' ? cambios(antes, despues).slice(0, 8) : [],
        };
    });

    // Ventas anuladas: UPDATE de ventas con estado true -> false
    const anuladas = registros
        .filter(x => x.tabla === 'ventas' && x.operacion === 'UPDATE'
            && (x.datosanteriores as Json)?.estado === true && (x.datosnuevos as Json)?.estado === false)
        .map(x => {
            const venta = x.datosnuevos as Record<string, unknown>;
            return { fecha: x.fecha, ventaid: venta.ventaid as number, total: num(venta.total), tipoventa: venta.tipoventa as string, usuarioid: x.usuarioid, usuario: nombreUsuario(x) };
        });

    const anuladasPorUsuario = new Map<string, { anulaciones: number; monto: number }>();
    for (const a of anuladas) {
        const g = anuladasPorUsuario.get(a.usuario) ?? { anulaciones: 0, monto: 0 };
        g.anulaciones++; g.monto += a.total;
        anuladasPorUsuario.set(a.usuario, g);
    }

    const contar = (clave: (x: (typeof registros)[number]) => string) => {
        const mapa = new Map<string, number>();
        for (const x of registros) mapa.set(clave(x), (mapa.get(clave(x)) ?? 0) + 1);
        return [...mapa.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
    };

    const usuarios = new Map<string, { insert: number; update: number; delete: number }>();
    for (const x of registros) {
        const g = usuarios.get(nombreUsuario(x)) ?? { insert: 0, update: 0, delete: 0 };
        if (x.operacion === 'INSERT') g.insert++;
        else if (x.operacion === 'UPDATE') g.update++;
        else if (x.operacion === 'DELETE') g.delete++;
        usuarios.set(nombreUsuario(x), g);
    }

    return {
        resumen: {
            eventos: registros.length,
            mostrados: eventos.length,
            ventasAnuladas: anuladas.length,
            montoAnulado: r2(anuladas.reduce((s, a) => s + a.total, 0)),
            sinUsuario: registros.filter(x => x.usuarioid == null).length,
        },
        tablasDisponibles: tablas.map(t => t.tabla).sort(),
        porUsuario: [...usuarios.entries()].map(([usuario, g]) => ({ usuario, ...g, total: g.insert + g.update + g.delete })).sort((a, b) => b.total - a.total),
        porTabla: contar(x => x.tabla),
        ventasAnuladas: anuladas,
        ventasAnuladasPorUsuario: [...anuladasPorUsuario.entries()].map(([usuario, g]) => ({ usuario, anulaciones: g.anulaciones, monto: r2(g.monto) })).sort((a, b) => b.anulaciones - a.anulaciones),
        eventos,
    };
}
