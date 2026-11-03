import { useState, useMemo } from 'react';
import { IconSearch, IconTrash, IconReturn } from './icons';

interface DevolucionesTabProps {
    loadingDevoluciones: boolean;
    devoluciones: any[];
    onNewDevolucion: () => void;
    onDelete: (dev: any) => void;
}

const thStyle = { padding: '1rem 0.75rem 1rem 0', fontWeight: 500 } as const;
const tdStyle = { padding: '1rem 0.75rem 1rem 0' } as const;

export const DevolucionesTab = ({ loadingDevoluciones, devoluciones, onNewDevolucion, onDelete }: DevolucionesTabProps) => {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return devoluciones;
        return devoluciones.filter(d =>
            String(d.ventaid).includes(q) ||
            String(d.id).includes(q) ||
            (d.productonombre || '').toLowerCase().includes(q) ||
            (d.motivo || '').toLowerCase().includes(q) ||
            (d.usuarionombre || '').toLowerCase().includes(q));
    }, [devoluciones, search]);

    const totalMonto = filtered.reduce((s, d) => s + Number(d.montodevuelto || 0), 0);
    const totalUnidades = filtered.reduce((s, d) => s + Number(d.cantidad || 0), 0);

    return (
        <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <div>
                    <h3 className="card-title" style={{ margin: 0 }}>Historial de Devoluciones</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                        Cada devolución repone el producto al inventario y se compensa al cliente: baja su deuda si compró a crédito, o se le reembolsa por el método elegido. Un cambio entrega otros productos en una venta nueva.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={onNewDevolucion} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '36px' }}>
                    <IconReturn />
                    <span>Nueva Devolución</span>
                </button>
            </div>

            <div className="responsive-grid-sm" style={{ marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-dark)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0.4rem' }}>Devoluciones</div>
                    <div className="tabular" style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--accent-primary)' }}>{filtered.length}</div>
                </div>
                <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-dark)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0.4rem' }}>Unidades repuestas</div>
                    <div className="tabular" style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-primary)' }}>{totalUnidades.toLocaleString('es-NI', { maximumFractionDigits: 2 })}</div>
                </div>
                <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--accent-danger-bg-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-danger-border)' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0.4rem' }}>Monto devuelto</div>
                    <div className="tabular" style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--accent-danger)' }}>C$ {totalMonto.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</div>
                </div>
            </div>

            <div className="form-input" style={{ display: 'flex', alignItems: 'center', flex: '1 1 200px', maxWidth: '300px', padding: '0 12px', gap: '8px', height: '36px', marginBottom: '1.5rem' }}>
                <IconSearch />
                <input type="text" placeholder="Buscar por venta, producto o motivo..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '0.9rem', padding: 0 }} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {loadingDevoluciones ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando devoluciones...</div>
            ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ minWidth: '1100px', width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Fecha</th>
                                <th style={thStyle}>Venta</th>
                                <th style={thStyle}>Producto</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Cantidad</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Monto</th>
                                <th style={thStyle}>Tipo</th>
                                <th style={thStyle}>Compensación</th>
                                <th style={thStyle}>Motivo</th>
                                <th style={thStyle}>Registrada por</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(d => (
                                <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }} className="tabular">#{d.id}</td>
                                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }} className="tabular">{d.fecha ? new Date(d.fecha).toLocaleString() : '—'}</td>
                                    <td style={tdStyle}>
                                        <span style={{ color: 'var(--accent-primary)', backgroundColor: 'var(--accent-primary-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>#{d.ventaid}</span>
                                    </td>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>{d.productonombre || `Producto #${d.productoid}`}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }} className="tabular">{Number(d.cantidad).toLocaleString('es-NI', { maximumFractionDigits: 2 })}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--accent-danger)' }} className="tabular">C$ {Number(d.montodevuelto).toFixed(2)}</td>
                                    <td style={tdStyle}>
                                        <span style={{ color: d.tipo === 'CAMBIO' ? 'var(--accent-warning)' : 'var(--accent-primary)', backgroundColor: d.tipo === 'CAMBIO' ? 'var(--accent-warning-bg-light)' : 'var(--accent-primary-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                            {d.tipo === 'CAMBIO' ? 'CAMBIO' : 'REEMBOLSO'}
                                        </span>
                                        {d.ventacambioid && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Venta #{d.ventacambioid}</div>}
                                    </td>
                                    <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                                        {Number(d.montoacreditado) > 0 && <div style={{ color: 'var(--accent-success)' }}>Deuda: -C$ {Number(d.montoacreditado).toFixed(2)}</div>}
                                        {Number(d.montoreembolsado) > 0 && <div style={{ color: 'var(--text-primary)' }}>{d.metodopago || 'Reembolso'}: C$ {Number(d.montoreembolsado).toFixed(2)}</div>}
                                        {Number(d.montoacreditado) === 0 && Number(d.montoreembolsado) === 0 && <span style={{ color: 'var(--text-secondary)' }}>{d.tipo === 'CAMBIO' ? 'Aplicado al cambio' : 'Sin asiento (anterior)'}</span>}
                                    </td>
                                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', maxWidth: '240px' }}>{d.motivo}</td>
                                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{d.usuarionombre || '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                        <button className="btn" onClick={() => onDelete(d)} title="Eliminar devolución (descuenta de nuevo el stock)" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', backgroundColor: 'var(--accent-danger-bg-light)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger-border)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <IconTrash />
                                            <span>Eliminar</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={11} style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>No se encontraron devoluciones.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
