import { useState, useMemo, useEffect } from 'react';
import { IconReturn, IconSearch } from './icons';
import { getSaleClientName } from './types';
import type { Venta } from './types';
import type { LineaDevolucion, LineaCambio, TipoDevolucion, MetodoDevolucion } from './useDevoluciones';

interface DevolucionModalProps {
    show: boolean;
    sales: Venta[];
    ventaSeleccionada: Venta | null;
    onSelectVenta: (v: Venta) => void;
    onChangeVenta: () => void;
    lineas: LineaDevolucion[];
    loadingLineas: boolean;
    cantidades: Record<number, string>;
    setCantidades: React.Dispatch<React.SetStateAction<Record<number, string>>>;
    motivo: string;
    setMotivo: (v: string) => void;
    saving: boolean;
    tipo: TipoDevolucion;
    setTipo: (t: TipoDevolucion) => void;
    metodo: MetodoDevolucion;
    setMetodo: (m: MetodoDevolucion) => void;
    referencia: string;
    setReferencia: (v: string) => void;
    cambioLineas: LineaCambio[];
    buscarProductos: (q: string) => Promise<any[]>;
    onAddCambio: (p: any) => void;
    onChangeCantidadCambio: (productoid: number, cantidad: string) => void;
    onRemoveCambio: (productoid: number) => void;
    montoLinea: (l: LineaDevolucion) => number;
    totalDevolucion: number;
    totalCambio: number;
    saldoCuenta: number;
    acreditado: number;
    reembolso: number;
    requiereMetodo: boolean;
    sinSesion: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}

const METODOS: { value: MetodoDevolucion; label: string }[] = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TARJETA', label: 'Tarjeta' },
    { value: 'BAC', label: 'Transferencia BAC' },
    { value: 'LAFISE', label: 'Transferencia Lafise' },
];

const c$ = (n: number) => `C$ ${n.toFixed(2)}`;

const sectionTitle = { fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '1.25rem 0 0.5rem' } as const;

/** NOTA: no cierra al hacer click en el backdrop para no perder lo digitado. */
export const DevolucionModal = ({
    show, sales, ventaSeleccionada, onSelectVenta, onChangeVenta, lineas, loadingLineas,
    cantidades, setCantidades, motivo, setMotivo, saving, tipo, setTipo, metodo, setMetodo, referencia, setReferencia,
    cambioLineas, buscarProductos, onAddCambio, onChangeCantidadCambio, onRemoveCambio,
    montoLinea, totalDevolucion, totalCambio, saldoCuenta, acreditado, reembolso, requiereMetodo, sinSesion, onSubmit, onClose,
}: DevolucionModalProps) => {
    const [query, setQuery] = useState('');
    const [productoQuery, setProductoQuery] = useState('');
    const [resultados, setResultados] = useState<any[]>([]);

    useEffect(() => {
        if (tipo !== 'CAMBIO' || !productoQuery.trim()) { setResultados([]); return; }
        const t = setTimeout(async () => setResultados((await buscarProductos(productoQuery)).slice(0, 5)), 250);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productoQuery, tipo]);

    const candidatas = useMemo(() => {
        const q = query.trim().toLowerCase();
        return sales
            .filter(s => s.tipoventa !== 'COTIZACION' && s.estado !== false && s.estado !== 'ANULADA' && !(s as any)._anulada)
            .filter(s => !q
                || String(s.id).includes(q)
                || (s.consecutivofiscal || '').toLowerCase().includes(q)
                || (s.consecutivonofiscal || '').toLowerCase().includes(q)
                || getSaleClientName(s).toLowerCase().includes(q))
            .slice(0, 6);
    }, [sales, query]);

    if (!show) return null;

    const diferencia = Math.round((totalCambio - totalDevolucion) * 100) / 100;
    const esTransferencia = metodo === 'BAC' || metodo === 'LAFISE';

    return (
        <div className="modal-backdrop">
            <div className="modal-content" style={{ maxWidth: '760px' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    <IconReturn />
                    <span>Nueva Devolución</span>
                </h2>

                <form onSubmit={onSubmit}>
                    {!ventaSeleccionada ? (
                        <div className="form-group">
                            <label className="form-label">Venta a devolver *</label>
                            <div className="form-input" style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px', height: '40px' }}>
                                <IconSearch />
                                <input type="text" autoFocus placeholder="Buscar por # de venta, consecutivo o cliente..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '0.9rem', padding: 0 }} value={query} onChange={(e) => setQuery(e.target.value)} />
                            </div>
                            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {candidatas.map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        className="btn"
                                        onClick={() => onSelectVenta(s)}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', textAlign: 'left', padding: '0.6rem 0.9rem', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                    >
                                        <span>
                                            <strong>#{s.id}</strong>
                                            <span style={{ color: 'var(--text-secondary)', marginLeft: '0.6rem' }}>{new Date(s.fecha).toLocaleDateString()} · {getSaleClientName(s)}</span>
                                        </span>
                                        <span className="tabular" style={{ fontWeight: 600 }}>{c$(Number(s.total))}</span>
                                    </button>
                                ))}
                                {candidatas.length === 0 && (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.5rem 0' }}>No se encontraron ventas.</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', marginBottom: '1rem', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Venta #{ventaSeleccionada.id}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {new Date(ventaSeleccionada.fecha).toLocaleDateString()} · {getSaleClientName(ventaSeleccionada)} · {c$(Number(ventaSeleccionada.total))}
                                        {saldoCuenta > 0 && <> · <span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>Saldo pendiente {c$(saldoCuenta)}</span></>}
                                    </div>
                                </div>
                                <button type="button" className="btn" onClick={onChangeVenta} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>Cambiar venta</button>
                            </div>

                            {/* Tipo */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                {([['REEMBOLSO', 'Reembolso'], ['CAMBIO', 'Cambio por otro producto']] as const).map(([value, label]) => {
                                    const active = tipo === value;
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            className={`btn ${active ? 'btn-primary' : ''}`}
                                            onClick={() => setTipo(value)}
                                            style={{ backgroundColor: active ? '' : 'var(--bg-card)', color: active ? '' : 'var(--text-primary)', border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)', fontSize: '0.85rem' }}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Productos devueltos */}
                            <div style={sectionTitle}>Productos que regresan</div>
                            {loadingLineas ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando productos...</div>
                            ) : (
                                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                    <table style={{ minWidth: '560px', width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                <th style={{ padding: '0.5rem 0', fontWeight: 500, textAlign: 'left' }}>Producto</th>
                                                <th style={{ padding: '0.5rem 0', fontWeight: 500, textAlign: 'center' }}>Vendida</th>
                                                <th style={{ padding: '0.5rem 0', fontWeight: 500, textAlign: 'center' }}>Ya devuelta</th>
                                                <th style={{ padding: '0.5rem 0', fontWeight: 500, textAlign: 'center' }}>A devolver</th>
                                                <th style={{ padding: '0.5rem 0', fontWeight: 500, textAlign: 'right' }}>Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lineas.map(l => (
                                                <tr key={l.productoid} style={{ borderBottom: '1px solid var(--border-color)', opacity: l.disponible === 0 ? 0.5 : 1 }}>
                                                    <td style={{ padding: '0.6rem 0', fontWeight: 600, color: 'var(--text-primary)' }}>{l.nombre}</td>
                                                    <td style={{ padding: '0.6rem 0', textAlign: 'center' }} className="tabular">{l.vendida}</td>
                                                    <td style={{ padding: '0.6rem 0', textAlign: 'center', color: 'var(--text-secondary)' }} className="tabular">{l.devuelta}</td>
                                                    <td style={{ padding: '0.6rem 0', textAlign: 'center' }}>
                                                        <input
                                                            type="number" min="0" max={l.disponible} step="any"
                                                            className="form-input tabular"
                                                            style={{ width: '90px', height: '34px', textAlign: 'center', padding: '0 8px' }}
                                                            value={cantidades[l.productoid] ?? ''}
                                                            placeholder={`máx ${l.disponible}`}
                                                            disabled={l.disponible === 0}
                                                            onChange={(e) => setCantidades(prev => ({ ...prev, [l.productoid]: e.target.value }))}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.6rem 0', textAlign: 'right', fontWeight: 600 }} className="tabular">{c$(montoLinea(l))}</td>
                                                </tr>
                                            ))}
                                            {lineas.length === 0 && (
                                                <tr><td colSpan={5} style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>Esta venta no tiene productos.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Productos del cambio */}
                            {tipo === 'CAMBIO' && (
                                <>
                                    <div style={sectionTitle}>Productos que se lleva el cliente</div>
                                    <div className="form-input" style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px', height: '38px' }}>
                                        <IconSearch />
                                        <input type="text" placeholder="Buscar producto por nombre o código..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '0.9rem', padding: 0 }} value={productoQuery} onChange={(e) => setProductoQuery(e.target.value)} />
                                    </div>
                                    {resultados.length > 0 && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            {resultados.map(p => {
                                                const pid = p.id ?? p.productoid;
                                                return (
                                                    <button
                                                        key={pid}
                                                        type="button"
                                                        className="btn"
                                                        onClick={() => { onAddCambio(p); setProductoQuery(''); setResultados([]); }}
                                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', textAlign: 'left', padding: '0.5rem 0.9rem', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                                    >
                                                        <span>{p.nombre} <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>· stock {Number(p.stockactual || 0)}</span></span>
                                                        <span className="tabular" style={{ fontWeight: 600 }}>{c$(Number(p.precioventa || 0))}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {cambioLineas.length > 0 && (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                                            <tbody>
                                                {cambioLineas.map(l => (
                                                    <tr key={l.productoid} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                        <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'var(--text-primary)' }}>{l.nombre}</td>
                                                        <td style={{ padding: '0.5rem 0', textAlign: 'right', color: 'var(--text-secondary)' }} className="tabular">{c$(l.precio)}</td>
                                                        <td style={{ padding: '0.5rem 0', textAlign: 'center' }}>
                                                            <input type="number" min="0" step="any" className="form-input tabular" style={{ width: '80px', height: '32px', textAlign: 'center', padding: '0 8px' }} value={l.cantidad} onChange={(e) => onChangeCantidadCambio(l.productoid, e.target.value)} />
                                                        </td>
                                                        <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 600 }} className="tabular">{c$(Number(l.cantidad || 0) * l.precio)}</td>
                                                        <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>
                                                            <button type="button" className="btn" onClick={() => onRemoveCambio(l.productoid)} title="Quitar" style={{ padding: '0.2rem 0.5rem', color: 'var(--accent-danger)' }}>x</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </>
                            )}

                            {/* Método de pago */}
                            <div style={sectionTitle}>
                                {tipo === 'CAMBIO' ? 'Método de pago del cambio' : 'Método de reembolso'}
                            </div>
                            {requiereMetodo ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '0 1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">{tipo === 'CAMBIO' ? 'Con qué se paga / devuelve la diferencia *' : 'Cómo se devuelve el dinero *'}</label>
                                        <select className="form-input" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoDevolucion)}>
                                            {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                    </div>
                                    {esTransferencia && (
                                        <div className="form-group">
                                            <label className="form-label">Número de transferencia *</label>
                                            <input type="text" className="form-input" value={referencia} onChange={(e) => setReferencia(e.target.value)} required />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    No hace falta: todo el monto se descuenta de la deuda del cliente.
                                </div>
                            )}

                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label className="form-label">Motivo *</label>
                                <input type="text" className="form-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Producto en mal estado" required />
                            </div>

                            {/* Resumen contable */}
                            <div style={{ padding: '0.9rem 1rem', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Valor de lo devuelto</span><strong className="tabular">{c$(totalDevolucion)}</strong></div>
                                {acreditado > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Se descuenta de la deuda del cliente</span><strong className="tabular" style={{ color: 'var(--accent-success)' }}>- {c$(acreditado)}</strong></div>
                                )}
                                {reembolso > 0 && tipo === 'REEMBOLSO' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Se devuelve al cliente ({METODOS.find(m => m.value === metodo)?.label})</span><strong className="tabular" style={{ color: 'var(--accent-danger)' }}>{c$(reembolso)}</strong></div>
                                )}
                                {tipo === 'CAMBIO' && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Valor de los productos nuevos</span><strong className="tabular">{c$(totalCambio)}</strong></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem' }}>
                                            <span style={{ fontWeight: 600 }}>{diferencia >= 0 ? 'Diferencia a cobrar al cliente' : 'Diferencia a favor del cliente'}</span>
                                            <strong className="tabular" style={{ color: diferencia >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{c$(Math.abs(diferencia))}</strong>
                                        </div>
                                    </>
                                )}
                            </div>

                            {sinSesion && (
                                <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', color: 'var(--accent-danger)', backgroundColor: 'var(--accent-danger-bg-light)', border: '1px solid var(--accent-danger-border)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
                                    Debe haber una sesión de caja abierta para registrar reembolsos o cambios.
                                </div>
                            )}
                        </>
                    )}

                    <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button type="button" className="btn" onClick={onClose}>Cancelar</button>
                        {ventaSeleccionada && (
                            <button type="submit" className="btn btn-primary" disabled={saving || loadingLineas || sinSesion}>
                                {saving ? 'Registrando...' : tipo === 'CAMBIO' ? 'Registrar Cambio' : 'Registrar Devolución'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};
