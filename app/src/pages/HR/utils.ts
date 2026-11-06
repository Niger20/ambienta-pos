export type Row = Record<string, any>;

export interface Opt {
    value: string | number;
    label: string;
}

export const money = (v: unknown) =>
    `C$ ${Number(v || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const num = (v: unknown, digits = 2) =>
    Number(v || 0).toLocaleString('es-NI', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Las columnas DATE llegan como ISO UTC; se muestran sin conversión de zona horaria. */
export const toInputDate = (v: unknown): string => (v ? String(v).slice(0, 10) : '');

export const toInputTime = (v: unknown): string => (v ? String(v).slice(11, 16) : '');

export const fmtDate = (v: unknown): string => {
    const d = toInputDate(v);
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
};

export const fmtTime = (v: unknown): string => toInputTime(v) || '—';

export const todayISO = (): string => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const addDaysISO = (iso: string, days: number): string => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

/** Días calendario entre dos fechas ISO, ambas incluidas. */
export const daysBetweenInclusive = (a: string, b: string): number => {
    const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
    return Math.round(ms / 86400000) + 1;
};

/** Días hábiles (lunes a sábado) entre dos fechas ISO, ambas incluidas. */
export const businessDays = (a: string, b: string): number => {
    if (!a || !b || b < a) return 0;
    let count = 0;
    for (let cur = a; cur <= b; cur = addDaysISO(cur, 1)) {
        const dow = new Date(`${cur}T00:00:00Z`).getUTCDay();
        if (dow !== 0) count++;
    }
    return count;
};

export const empleadoNombre = (e?: Row | null): string => (e ? `${e.nombre ?? ''} ${e.apellidos ?? ''}`.trim() : '—');

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const apiError = (err: any, fallback: string): string => {
    const e = err?.response?.data?.error;
    return typeof e === 'string' ? e : fallback;
};

export const labelize = (s: string) =>
    s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());

export const optsFrom = (values: string[]): Opt[] => values.map(v => ({ value: v, label: labelize(v) }));

export const periodoLabel = (p?: Row | null): string =>
    p ? `${labelize(String(p.tipoperiodo || 'MENSUAL'))} ${fmtDate(p.fechainicio)} al ${fmtDate(p.fechafin)}` : '—';
