import type { ReactNode } from 'react';
import { DataTable, Td } from '../../HR/ui';
import type { Columna } from './columnas';

// ─── Encabezado de un reporte ───────────────────────────────────────────
export const ReporteHeader = ({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ minWidth: 0 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{titulo}</h3>
            {descripcion && <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.25rem' }}>{descripcion}</p>}
        </div>
        {acciones && <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>{acciones}</div>}
    </div>
);

export const BotonReporte = ({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) => (
    <button className="btn" onClick={onClick} disabled={disabled} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        {children}
    </button>
);

// ─── Estados de carga / error ───────────────────────────────────────────
export const EstadoCarga = ({ loading, error }: { loading: boolean; error: string }) => {
    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando reporte...</div>;
    if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-danger)' }}>{error}</div>;
    return null;
};

// ─── Sección con título dentro de un reporte ────────────────────────────
export const Seccion = ({ titulo, children, nota }: { titulo: string; children: ReactNode; nota?: string }) => (
    <div style={{ marginTop: '1.75rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>{titulo}</div>
        {nota && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>{nota}</div>}
        {children}
    </div>
);

// ─── Barra horizontal proporcional ──────────────────────────────────────
export const Barra = ({ valor, maximo, tono = 'primary' }: { valor: number; maximo: number; tono?: 'primary' | 'success' | 'danger' | 'warning' }) => (
    <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-hover)', overflow: 'hidden', minWidth: '80px' }}>
        <div style={{ width: `${maximo > 0 ? Math.max(0, Math.min(100, (valor / maximo) * 100)) : 0}%`, height: '100%', backgroundColor: `var(--accent-${tono})`, transition: 'width 0.3s var(--ease-out)' }} />
    </div>
);

export function TablaReporte<T>({ columnas, filas, vacio = 'Sin datos para este rango.', pie }: {
    columnas: Columna<T>[];
    filas: T[];
    vacio?: string;
    pie?: ReactNode;
}) {
    return (
        <DataTable columns={columnas.map(c => ({ header: c.header, align: c.align }))} isEmpty={filas.length === 0} emptyText={vacio}>
            {filas.map((fila, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {columnas.map((c, j) => (
                        <Td key={j} align={c.align} strong={c.strong} muted={c.muted}>{c.render(fila)}</Td>
                    ))}
                </tr>
            ))}
            {pie}
        </DataTable>
    );
}

/** Texto numérico con tabulares para alinear cifras. */
export const Cifra = ({ children, color, bold }: { children: ReactNode; color?: string; bold?: boolean }) => (
    <span className="tabular" style={{ color, fontWeight: bold ? 700 : undefined }}>{children}</span>
);

