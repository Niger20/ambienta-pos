import type { ReactNode } from 'react';

// ─── Tabla genérica con columnas declarativas ───────────────────────────
export interface Columna<T> {
    header: string;
    align?: 'left' | 'right' | 'center';
    /** Contenido mostrado en pantalla. */
    render: (fila: T) => ReactNode;
    /** Valor para exportar a Excel (si falta, la columna no se exporta). */
    excel?: (fila: T) => string | number | null;
    strong?: boolean;
    muted?: boolean;
}

/** Convierte las columnas declarativas y las filas en una hoja de Excel. */
export function aHoja<T>(nombre: string, columnas: Columna<T>[], filas: T[]) {
    const exportables = columnas.filter(c => c.excel);
    return {
        nombre,
        filas: [exportables.map(c => c.header), ...filas.map(f => exportables.map(c => c.excel!(f)))],
    };
}

export const negativoRojo = (n: number) => (n < 0 ? 'var(--accent-danger)' : undefined);
