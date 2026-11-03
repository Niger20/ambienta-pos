// Utilidades compartidas por los reportes. Las fechas se guardan en UTC y el negocio
// opera en hora de Nicaragua (UTC-6, sin horario de verano), igual que los reportes de utilidad.
const TZ_HORAS = 6;
const TZ_OFFSET = '-06:00';

export const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const num = (v: unknown): number => (v == null ? 0 : Number(v));

/** Fecha/hora de pared en Nicaragua; se lee siempre con los getters UTC. */
export const aLocal = (d: Date): Date => new Date(d.getTime() - TZ_HORAS * 3600 * 1000);

export const diaLocal = (d: Date): string => aLocal(d).toISOString().slice(0, 10);

export const mesLocal = (d: Date): string => aLocal(d).toISOString().slice(0, 7);

export const hoyLocal = (): string => diaLocal(new Date());

export interface Rango {
    inicio: Date;
    fin: Date;
}

const parseFecha = (valor: string, finDeDia: boolean): Date => {
    const texto = valor.trim();
    const conZona = texto.includes('T') ? texto : `${texto}T${finDeDia ? '23:59:59.999' : '00:00:00.000'}${TZ_OFFSET}`;
    return new Date(conZona);
};

/** Rango [fechaInicio, fechaFin] de la consulta; por defecto, del primer día del mes a hoy. */
export function parseRango(query: { [key: string]: any }): [string?, Rango?] {
    const hoy = hoyLocal();
    const primerDiaMes = `${hoy.slice(0, 7)}-01`;

    const inicio = parseFecha(query.fechaInicio ? String(query.fechaInicio) : primerDiaMes, false);
    const fin = parseFecha(query.fechaFin ? String(query.fechaFin) : hoy, true);

    if (isNaN(inicio.getTime())) return ['fechaInicio no es una fecha válida', undefined];
    if (isNaN(fin.getTime())) return ['fechaFin no es una fecha válida', undefined];
    if (fin < inicio) return ['fechaFin no puede ser anterior a fechaInicio', undefined];
    return [undefined, { inicio, fin }];
}

/** Período inmediatamente anterior y de igual duración (para comparativos). */
export function periodoAnterior(r: Rango): Rango {
    const duracion = r.fin.getTime() - r.inicio.getTime() + 1;
    return { inicio: new Date(r.inicio.getTime() - duracion), fin: new Date(r.inicio.getTime() - 1) };
}

export type MetodoCaja = 'EFECTIVO' | 'BAC' | 'LAFISE' | 'TARJETA' | 'OTRO';

/** Mismo criterio que el cierre de caja del frontend (banco o método de pago). */
export const normalizarMetodo = (m: string | null | undefined): MetodoCaja => {
    if (!m) return 'EFECTIVO';
    const u = m.toUpperCase().trim();
    if (u.includes('BAC')) return 'BAC';
    if (u.includes('LAFISE')) return 'LAFISE';
    if (u.includes('TARJETA') || u.includes('POS') || u.includes('CARD') || u.includes('DEBIT')) return 'TARJETA';
    if (u.includes('EFECTIVO') || u.includes('CASH') || u.includes('NIO') || u.includes('USD')) return 'EFECTIVO';
    return 'OTRO';
};

export const METODOS: MetodoCaja[] = ['EFECTIVO', 'BAC', 'LAFISE', 'TARJETA', 'OTRO'];

/** Suma agrupada: acumula `valor` bajo `clave`. */
export function acumular<T extends string | number>(mapa: Map<T, number>, clave: T, valor: number): void {
    mapa.set(clave, (mapa.get(clave) ?? 0) + valor);
}

export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Ventas válidas para efectos contables: vigentes y que no sean cotizaciones. */
export const VENTA_VALIDA = { estado: true, tipoventa: { not: 'COTIZACION' } } as const;
