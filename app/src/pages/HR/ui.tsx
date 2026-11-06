import type { ReactNode, CSSProperties } from 'react';
import { IconSearch, IconEdit, IconTrash } from './icons';

// ─── Buscador ───────────────────────────────────────────────────────────
export const SearchBox = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div className="form-input" style={{ display: 'flex', alignItems: 'center', flex: '1 1 200px', maxWidth: '300px', padding: '0 12px', gap: '8px', height: '36px' }}>
        <IconSearch />
        <input
            type="text"
            placeholder={placeholder || 'Buscar...'}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '0.9rem', padding: 0 }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

// ─── Interruptor Activos / Inactivos ────────────────────────────────────
export const StatusToggle = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
    <div
        onClick={onToggle}
        style={{
            display: 'inline-flex', alignItems: 'center', cursor: 'pointer', width: '40px', height: '24px',
            backgroundColor: active ? 'var(--accent-success)' : 'var(--accent-danger)',
            borderRadius: '12px', position: 'relative', transition: 'background-color 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
        title="Clic para alternar filtro (Activos / Inactivos)"
    >
        <div style={{
            width: '18px', height: '18px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: '3px',
            transform: active ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform 0.25s cubic-bezier(0.23, 1, 0.32, 1)', boxShadow: 'var(--shadow-sm)',
        }} />
    </div>
);

// ─── Insignias de estado ────────────────────────────────────────────────
type Tone = 'success' | 'warning' | 'danger' | 'primary' | 'neutral';

const TONE_STYLE: Record<Tone, CSSProperties> = {
    success: { border: '1px solid var(--accent-success-border)', backgroundColor: 'var(--accent-success-bg-light)', color: 'var(--accent-success)' },
    warning: { border: '1px solid var(--accent-warning-border)', backgroundColor: 'var(--accent-warning-bg-light)', color: 'var(--accent-warning)' },
    danger: { border: '1px solid var(--accent-danger-border)', backgroundColor: 'var(--accent-danger-bg-light)', color: 'var(--accent-danger)' },
    primary: { border: '1px solid var(--accent-primary-border)', backgroundColor: 'var(--accent-primary-bg)', color: 'var(--accent-primary)' },
    neutral: { border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' },
};

const ESTADO_TONE: Record<string, Tone> = {
    ACTIVO: 'success', APROBADO: 'success', APROBADA: 'success', PAGADO: 'success', PAGADA: 'success', DESCONTADO: 'success', DISFRUTADA: 'primary', CERRADO: 'neutral',
    PENDIENTE: 'warning', BORRADOR: 'warning', ABIERTO: 'primary', EN_REVISION: 'warning',
    RECHAZADA: 'danger', CANCELADO: 'danger', CANCELADA: 'danger', VENCIDA: 'danger',
};

const toneOf = (estado: string): Tone => ESTADO_TONE[estado] || 'neutral';

export const Badge = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) => (
    <span style={{ display: 'inline-block', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', ...TONE_STYLE[tone] }}>
        {children}
    </span>
);

export const EstadoBadge = ({ estado }: { estado?: string | null }) => {
    if (!estado) return <span style={{ color: 'var(--text-secondary)' }}>—</span>;
    return <Badge tone={toneOf(estado)}>{estado.replace(/_/g, ' ')}</Badge>;
};

export const ActivoBadge = ({ activo }: { activo: boolean }) => (
    <Badge tone={activo ? 'success' : 'danger'}>{activo ? 'Activo' : 'Inactivo'}</Badge>
);

// ─── Tarjetas de resumen ────────────────────────────────────────────────
export interface SummaryItem {
    label: string;
    value: ReactNode;
    tone?: 'primary' | 'success' | 'danger' | 'warning' | 'default';
}

export const SummaryCards = ({ items }: { items: SummaryItem[] }) => {
    if (items.length === 0) return null;
    return (
        <div className="responsive-grid-sm" style={{ marginBottom: '1.5rem' }}>
            {items.map(it => {
                const tone = it.tone || 'default';
                const color = tone === 'default' ? 'var(--text-primary)' : `var(--accent-${tone})`;
                const isTinted = tone === 'success' || tone === 'danger';
                const bg = tone === 'success' ? 'var(--accent-success-bg-light)' : tone === 'danger' ? 'var(--accent-danger-bg-light)' : 'var(--bg-dark)';
                const border = tone === 'success' ? '1px solid var(--accent-success-border)' : tone === 'danger' ? '1px solid var(--accent-danger-border)' : '1px solid var(--border-color)';
                return (
                    <div key={it.label} style={{ padding: '1rem 1.25rem', backgroundColor: bg, borderRadius: 'var(--radius-md)', border: isTinted ? border : '1px solid var(--border-color)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0.4rem' }}>{it.label}</div>
                        <div className="tabular" style={{ fontWeight: 700, fontSize: '1.4rem', color }}>{it.value}</div>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Pestañas (nivel principal y secundario) ────────────────────────────
export interface TabDef<K extends string = string> {
    key: K;
    label: string;
    icon?: ReactNode;
}

export function PrimaryTabs<K extends string>({ tabs, active, onChange }: { tabs: TabDef<K>[]; active: K; onChange: (k: K) => void }) {
    return (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
            {tabs.map(t => {
                const isActive = active === t.key;
                return (
                    <button
                        key={t.key}
                        className={`btn ${isActive ? 'btn-primary' : ''}`}
                        onClick={() => onChange(t.key)}
                        style={{
                            padding: '0.6rem 1.2rem',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            backgroundColor: !isActive ? 'var(--bg-card)' : '',
                            color: !isActive ? 'var(--text-primary)' : '',
                            border: !isActive ? '1px solid var(--border-color)' : '1px solid var(--accent-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            transition: 'all 0.2s var(--ease-out)',
                        }}
                    >
                        {t.icon}
                        <span>{t.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export function SubTabs<K extends string>({ tabs, active, onChange }: { tabs: TabDef<K>[]; active: K; onChange: (k: K) => void }) {
    return (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {tabs.map(t => {
                const isActive = active === t.key;
                return (
                    <button
                        key={t.key}
                        className="btn"
                        onClick={() => onChange(t.key)}
                        style={{
                            padding: '0.4rem 0.9rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            border: isActive ? '1px solid var(--accent-primary-border)' : '1px solid var(--border-color)',
                            backgroundColor: isActive ? 'var(--accent-primary-bg)' : 'transparent',
                            color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        }}
                    >
                        {t.icon}
                        <span>{t.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ─── Botones de acción de fila ──────────────────────────────────────────
const rowBtn: CSSProperties = { padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' };

export const EditButton = ({ onClick, label = 'Editar' }: { onClick: () => void; label?: string }) => (
    <button className="btn" onClick={onClick} style={rowBtn} title={label}>
        <IconEdit />
        <span>{label}</span>
    </button>
);

export const DeleteButton = ({ onClick, label = 'Eliminar' }: { onClick: () => void; label?: string }) => (
    <button
        className="btn"
        onClick={onClick}
        style={{ ...rowBtn, backgroundColor: 'var(--accent-danger-bg-light)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger-border)' }}
        title={label}
    >
        <IconTrash />
        <span>{label}</span>
    </button>
);

export const ActionButton = ({ onClick, children, tone = 'default', title, disabled }: {
    onClick: () => void;
    children: ReactNode;
    tone?: 'default' | 'success' | 'danger' | 'primary';
    title?: string;
    disabled?: boolean;
}) => {
    const toneStyle: CSSProperties =
        tone === 'success' ? { backgroundColor: 'var(--accent-success-bg-light)', color: 'var(--accent-success)', border: '1px solid var(--accent-success-border)' }
            : tone === 'danger' ? { backgroundColor: 'var(--accent-danger-bg-light)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger-border)' }
                : tone === 'primary' ? { backgroundColor: 'var(--accent-primary-bg)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary-border)' }
                    : {};
    return (
        <button className="btn" onClick={onClick} style={{ ...rowBtn, ...toneStyle, opacity: disabled ? 0.5 : 1 }} title={title} disabled={disabled}>
            {children}
        </button>
    );
};

export const RowActions = ({ children }: { children: ReactNode }) => (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>{children}</div>
);

// ─── Tabla ──────────────────────────────────────────────────────────────
export interface TableColumn {
    header: string;
    align?: 'left' | 'right' | 'center';
}

export const DataTable = ({ columns, children, isEmpty, emptyText }: {
    columns: TableColumn[];
    children: ReactNode;
    isEmpty: boolean;
    emptyText: string;
}) => (
    <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    {columns.map((c, i) => (
                        <th key={`${c.header}-${i}`} style={{ padding: '1rem 0.75rem 1rem 0', fontWeight: 500, textAlign: c.align || 'left', whiteSpace: 'nowrap' }}>{c.header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {children}
                {isEmpty && (
                    <tr>
                        <td colSpan={columns.length} style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>{emptyText}</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

export const Td = ({ children, align, strong, muted, style }: { children: ReactNode; align?: 'left' | 'right' | 'center'; strong?: boolean; muted?: boolean; style?: CSSProperties }) => (
    <td style={{
        padding: '1rem 0.75rem 1rem 0',
        textAlign: align || 'left',
        fontWeight: strong ? 600 : undefined,
        color: strong ? 'var(--text-primary)' : muted ? 'var(--text-secondary)' : undefined,
        ...style,
    }}>
        {children}
    </td>
);

// ─── Modal de formulario ────────────────────────────────────────────────
/** NOTA: igual que los demás formularios del sistema, no cierra al hacer click en el backdrop. */
export const FormModal = ({ show, title, icon, maxWidth = '600px', onClose, onSubmit, submitLabel = 'Guardar', children, hideSubmit }: {
    show: boolean;
    title: string;
    icon?: ReactNode;
    maxWidth?: string;
    onClose: () => void;
    onSubmit?: (e: React.FormEvent) => void;
    submitLabel?: string;
    children: ReactNode;
    hideSubmit?: boolean;
}) => {
    if (!show) return null;
    return (
        <div className="modal-backdrop">
            <div className="modal-content" style={{ maxWidth }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    {icon}
                    <span>{title}</span>
                </h2>
                <form onSubmit={onSubmit || ((e) => e.preventDefault())}>
                    {children}
                    <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button type="button" className="btn" onClick={onClose}>{hideSubmit ? 'Cerrar' : 'Cancelar'}</button>
                        {!hideSubmit && <button type="submit" className="btn btn-primary">{submitLabel}</button>}
                    </div>
                </form>
            </div>
        </div>
    );
};

/** Rejilla de dos columnas para campos de formulario. */
export const FormGrid = ({ children }: { children: ReactNode }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '0 1rem' }}>{children}</div>
);

// ─── Encabezado de sección ──────────────────────────────────────────────
export const SectionToolbar = ({ left, right }: { left?: ReactNode; right?: ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 200px' }}>{left}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>{right}</div>
    </div>
);

export const PrimaryButton = ({ onClick, children, type = 'button' }: { onClick?: () => void; children: ReactNode; type?: 'button' | 'submit' }) => (
    <button type={type} className="btn btn-primary" onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        {children}
    </button>
);

export const FilterSelect = ({ value, onChange, options, allLabel }: { value: string; onChange: (v: string) => void; options: { value: string | number; label: string }[]; allLabel: string }) => (
    <select className="form-input" value={value} onChange={(e) => onChange(e.target.value)} style={{ height: '36px', padding: '0 12px', width: 'auto', minWidth: '160px' }}>
        <option value="">{allLabel}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
);
