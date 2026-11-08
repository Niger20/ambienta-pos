import { useState } from 'react';
import { Badge, SummaryCards } from '../../HR/ui';
import { fmtDate, money, num } from '../../HR/utils';
import { useReporte } from './useReporte';
import { descargarExcel, hoyArchivo } from './export';
import { BotonReporte, Barra, Cifra, EstadoCarga, ReporteHeader, Seccion, TablaReporte } from './parts';
import { aHoja, negativoRojo } from './columnas';
import type { Columna } from './columnas';

interface Rango { fechaInicio: string; fechaFin: string }
const fechaHora = (v: string | null) => (v ? new Date(v).toLocaleString('es-NI') : '—');

// ─── Ventas por día, hora y día de la semana ────────────────────────────
interface PeriodoResp {
    resumen: { ventas: number; total: number; ticketPromedio: number; mejorDia: { fecha: string; total: number } | null; horaPico: number | null };
    porDia: { fecha: string; ventas: number; total: number }[];
    porHora: { hora: number; ventas: number; total: number }[];
    porDiaSemana: { dia: number; nombre: string; ventas: number; total: number }[];
}

export const VentasPeriodoReport = ({ fechaInicio, fechaFin }: Rango) => {
    const { data, loading, error } = useReporte<PeriodoResp>('ventas-periodo', { fechaInicio, fechaFin });
    const horas = data?.porHora ?? [];
    const maxHora = Math.max(0, ...horas.map(h => h.total));
    const maxDia = Math.max(0, ...(data?.porDiaSemana ?? []).map(d => d.total));

    const columnasDia: Columna<PeriodoResp['porDia'][number]>[] = [
        { header: 'Fecha', render: f => fmtDate(f.fecha), excel: f => f.fecha, muted: true },
        { header: 'Ventas', align: 'right', render: f => f.ventas, excel: f => f.ventas },
        { header: 'Total', align: 'right', render: f => <Cifra bold>{money(f.total)}</Cifra>, excel: f => f.total },
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Ventas por período"
                descripcion="Cuándo se vende: por día, por hora del día y por día de la semana (hora de Nicaragua). Excluye ventas anuladas y cotizaciones."
                acciones={data && <BotonReporte onClick={() => descargarExcel(`ventas-periodo-${hoyArchivo()}`, [
                    aHoja('Por día', columnasDia, data.porDia),
                    { nombre: 'Por hora', filas: [['Hora', 'Ventas', 'Total'], ...data.porHora.map(h => [`${h.hora}:00`, h.ventas, h.total])] },
                    { nombre: 'Por día de semana', filas: [['Día', 'Ventas', 'Total'], ...data.porDiaSemana.map(d => [d.nombre, d.ventas, d.total])] },
                ])}>Excel</BotonReporte>}
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Ventas', value: data.resumen.ventas, tone: 'primary' },
                        { label: 'Total vendido', value: money(data.resumen.total), tone: 'success' },
                        { label: 'Ticket promedio', value: money(data.resumen.ticketPromedio) },
                        { label: 'Hora pico', value: data.resumen.horaPico != null ? `${data.resumen.horaPico}:00` : '—' },
                        { label: 'Mejor día', value: data.resumen.mejorDia ? `${fmtDate(data.resumen.mejorDia.fecha)} · ${money(data.resumen.mejorDia.total)}` : '—' },
                    ]} />

                    <Seccion titulo="Por hora del día">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {horas.filter(h => h.ventas > 0).map(h => (
                                <div key={h.hora} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 150px', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{String(h.hora).padStart(2, '0')}:00</span>
                                    <Barra valor={h.total} maximo={maxHora} />
                                    <span className="tabular" style={{ textAlign: 'right' }}>{money(h.total)} <span style={{ color: 'var(--text-secondary)' }}>({h.ventas})</span></span>
                                </div>
                            ))}
                            {horas.every(h => h.ventas === 0) && <div style={{ color: 'var(--text-secondary)' }}>Sin ventas en el rango.</div>}
                        </div>
                    </Seccion>

                    <Seccion titulo="Por día de la semana">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {data.porDiaSemana.map(d => (
                                <div key={d.dia} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 150px', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{d.nombre}</span>
                                    <Barra valor={d.total} maximo={maxDia} tono="success" />
                                    <span className="tabular" style={{ textAlign: 'right' }}>{money(d.total)} <span style={{ color: 'var(--text-secondary)' }}>({d.ventas})</span></span>
                                </div>
                            ))}
                        </div>
                    </Seccion>

                    <Seccion titulo="Por día">
                        <TablaReporte columnas={columnasDia} filas={data.porDia} />
                    </Seccion>
                </>
            )}
        </div>
    );
};

// ─── Ventas por categoría, mayoreo contra detalle y por cajero ──────────
interface Acum { cantidad: number; total: number; costo: number; devuelto: number; neto: number; utilidad: number }
interface CategoriaResp {
    porCategoria: (Acum & { categoria: string; participacion: number; subcategorias: (Acum & { nombre: string })[] })[];
    porModalidad: { modalidad: string; lineas: number; cantidad: number; total: number; costo: number; utilidad: number }[];
    porCajero: { cajero: string; ventas: number; total: number; descuentos: number; devoluciones: number; montoDevuelto: number; ticketPromedio: number }[];
    totalNeto: number;
}

export const VentasCategoriaReport = ({ fechaInicio, fechaFin }: Rango) => {
    const { data, loading, error } = useReporte<CategoriaResp>('ventas-categoria', { fechaInicio, fechaFin });
    const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
    const alternar = (c: string) => setAbiertas(prev => { const s = new Set(prev); if (s.has(c)) s.delete(c); else s.add(c); return s; });

    const columnasCajero: Columna<CategoriaResp['porCajero'][number]>[] = [
        { header: 'Cajero', render: f => f.cajero, excel: f => f.cajero, strong: true },
        { header: 'Ventas', align: 'right', render: f => f.ventas, excel: f => f.ventas },
        { header: 'Total', align: 'right', render: f => <Cifra bold>{money(f.total)}</Cifra>, excel: f => f.total },
        { header: 'Ticket promedio', align: 'right', render: f => <Cifra>{money(f.ticketPromedio)}</Cifra>, excel: f => f.ticketPromedio },
        { header: 'Descuentos', align: 'right', render: f => <Cifra>{money(f.descuentos)}</Cifra>, excel: f => f.descuentos },
        { header: 'Devoluciones', align: 'right', render: f => `${f.devoluciones} · ${money(f.montoDevuelto)}`, excel: f => f.montoDevuelto },
    ];
    const columnasModalidad: Columna<CategoriaResp['porModalidad'][number]>[] = [
        { header: 'Modalidad', render: f => f.modalidad === 'MAYOREO' ? 'Mayoreo' : 'Detalle', excel: f => f.modalidad, strong: true },
        { header: 'Líneas', align: 'right', render: f => f.lineas, excel: f => f.lineas },
        { header: 'Unidades', align: 'right', render: f => num(f.cantidad), excel: f => f.cantidad },
        { header: 'Total', align: 'right', render: f => <Cifra bold>{money(f.total)}</Cifra>, excel: f => f.total },
        { header: 'Utilidad', align: 'right', render: f => <Cifra>{money(f.utilidad)}</Cifra>, excel: f => f.utilidad },
    ];

    const exportar = () => {
        if (!data) return;
        const filasCategoria: (string | number | null)[][] = [['Categoría', 'Subcategoría', 'Unidades', 'Vendido', 'Devuelto', 'Neto', 'Costo', 'Utilidad']];
        for (const c of data.porCategoria) {
            filasCategoria.push([c.categoria, '', c.cantidad, c.total, c.devuelto, c.neto, c.costo, c.utilidad]);
            for (const s of c.subcategorias) filasCategoria.push(['', s.nombre, s.cantidad, s.total, s.devuelto, s.neto, s.costo, s.utilidad]);
        }
        descargarExcel(`ventas-categoria-${hoyArchivo()}`, [{ nombre: 'Por categoría', filas: filasCategoria }, aHoja('Mayoreo vs detalle', columnasModalidad, data.porModalidad), aHoja('Por cajero', columnasCajero, data.porCajero)]);
    };

    return (
        <div className="card">
            <ReporteHeader
                titulo="Ventas por categoría, modalidad y cajero"
                descripcion="Las subcategorías se suman a su categoría principal. Mayoreo = línea vendida al precio de mayoreo del producto. El cajero es el dueño de la sesión de caja."
                acciones={data && <BotonReporte onClick={exportar}>Excel</BotonReporte>}
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[{ label: 'Ventas netas de devoluciones', value: money(data.totalNeto), tone: 'success' }]} />

                    <Seccion titulo="Por categoría" nota="Haga clic en una categoría para ver sus subcategorías.">
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                        {['Categoría', 'Unidades', 'Vendido', 'Devuelto', 'Neto', 'Utilidad', '%'].map((h, i) => (
                                            <th key={h} style={{ padding: '0.9rem 0.75rem 0.9rem 0', fontWeight: 500, textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.porCategoria.map(c => {
                                        const abierta = abiertas.has(c.categoria);
                                        return [
                                            <tr key={c.categoria} onClick={() => c.subcategorias.length && alternar(c.categoria)} style={{ borderBottom: '1px solid var(--border-color)', cursor: c.subcategorias.length ? 'pointer' : 'default' }}>
                                                <td style={{ padding: '0.9rem 0.75rem 0.9rem 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {c.subcategorias.length > 0 && <span style={{ display: 'inline-block', width: '1rem', color: 'var(--text-secondary)' }}>{abierta ? '▾' : '▸'}</span>}
                                                    {c.categoria}
                                                </td>
                                                <td className="tabular" style={{ textAlign: 'right', paddingRight: '0.75rem' }}>{num(c.cantidad)}</td>
                                                <td className="tabular" style={{ textAlign: 'right', paddingRight: '0.75rem' }}>{money(c.total)}</td>
                                                <td className="tabular" style={{ textAlign: 'right', paddingRight: '0.75rem', color: c.devuelto > 0 ? 'var(--accent-danger)' : undefined }}>{money(c.devuelto)}</td>
                                                <td className="tabular" style={{ textAlign: 'right', paddingRight: '0.75rem', fontWeight: 700 }}>{money(c.neto)}</td>
                                                <td className="tabular" style={{ textAlign: 'right', paddingRight: '0.75rem', color: negativoRojo(c.utilidad) }}>{money(c.utilidad)}</td>
                                                <td className="tabular" style={{ textAlign: 'right' }}>{num(c.participacion, 1)} %</td>
                                            </tr>,
                                            ...(abierta ? c.subcategorias.map(s => (
                                                <tr key={`${c.categoria}-${s.nombre}`} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-secondary)' }}>
                                                    <td style={{ padding: '0.7rem 0.75rem 0.7rem 1.5rem' }}>{s.nombre}</td>
                                                    <td className="tabular" style={{ textAlign: 'right', paddingRight: '0.75rem' }}>{num(s.cantidad)}</td>
                                                    <td className="tabular" style={{ textAlign: 'right', paddingRight: '0.75rem' }}>{money(s.total)}</td>
                                                    <td className="tabular" style={{ textAlign: 'right', paddingRight: '0.75rem' }}>{money(s.devuelto)}</td>
                                                    <td className="tabular" style={{ textAlign: 'right', paddingRight: '0.75rem' }}>{money(s.neto)}</td>
                                                    <td className="tabular" style={{ textAlign: 'right', paddingRight: '0.75rem' }}>{money(s.utilidad)}</td>
                                                    <td />
                                                </tr>
                                            )) : []),
                                        ];
                                    })}
                                    {data.porCategoria.length === 0 && <tr><td colSpan={7} style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>Sin ventas en el rango.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </Seccion>

                    <Seccion titulo="Mayoreo contra detalle"><TablaReporte columnas={columnasModalidad} filas={data.porModalidad} /></Seccion>
                    <Seccion titulo="Por cajero"><TablaReporte columnas={columnasCajero} filas={data.porCajero} /></Seccion>
                </>
            )}
        </div>
    );
};

// ─── Top clientes ───────────────────────────────────────────────────────
interface ClientesResp {
    total: number;
    totalClientes: number;
    clientes: { clienteid: number | null; cliente: string; telefono: string | null; compras: number; total: number; ticketPromedio: number; participacion: number; ultimaCompra: string; frecuenciaDias: number | null; deudaPendiente: number }[];
}

export const TopClientesReport = ({ fechaInicio, fechaFin }: Rango) => {
    const { data, loading, error } = useReporte<ClientesResp>('top-clientes', { fechaInicio, fechaFin, limite: 50 });

    const columnas: Columna<ClientesResp['clientes'][number]>[] = [
        { header: 'Cliente', render: f => f.cliente, excel: f => f.cliente, strong: true },
        { header: 'Teléfono', render: f => f.telefono || '—', excel: f => f.telefono, muted: true },
        { header: 'Compras', align: 'right', render: f => f.compras, excel: f => f.compras },
        { header: 'Total comprado', align: 'right', render: f => <Cifra bold>{money(f.total)}</Cifra>, excel: f => f.total },
        { header: '% del total', align: 'right', render: f => `${num(f.participacion, 1)} %`, excel: f => f.participacion },
        { header: 'Ticket promedio', align: 'right', render: f => <Cifra>{money(f.ticketPromedio)}</Cifra>, excel: f => f.ticketPromedio },
        { header: 'Cada (días)', align: 'right', render: f => f.frecuenciaDias != null ? num(f.frecuenciaDias, 1) : '—', excel: f => f.frecuenciaDias },
        { header: 'Última compra', render: f => fmtDate(f.ultimaCompra), excel: f => f.ultimaCompra?.slice(0, 10), muted: true },
        { header: 'Deuda pendiente', align: 'right', render: f => <Cifra color={f.deudaPendiente > 0 ? 'var(--accent-danger)' : undefined}>{money(f.deudaPendiente)}</Cifra>, excel: f => f.deudaPendiente },
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Top clientes"
                descripcion="Clientes que más compran en el rango, con ticket promedio, frecuencia de compra y su deuda pendiente actual."
                acciones={data && <BotonReporte onClick={() => descargarExcel(`top-clientes-${hoyArchivo()}`, [aHoja('Top clientes', columnas, data.clientes)])}>Excel</BotonReporte>}
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Clientes con compras', value: data.totalClientes, tone: 'primary' },
                        { label: 'Total vendido', value: money(data.total), tone: 'success' },
                    ]} />
                    <TablaReporte columnas={columnas} filas={data.clientes} />
                </>
            )}
        </div>
    );
};

// ─── Libro de ventas ────────────────────────────────────────────────────
interface LibroResp {
    filas: { ventaid: number; fecha: string; comprobante: 'FISCAL' | 'NO_FISCAL' | 'SIN_COMPROBANTE'; consecutivo: string | null; cliente: string; identificacion: string | null; tipoventa: string; descuento: number; total: number; anulada: boolean }[];
    resumen: Record<'fiscal' | 'noFiscal' | 'sinComprobante' | 'anuladas', { cantidad: number; total: number }> & { totalVigente: number };
    faltantes: { fiscal: string[]; noFiscal: string[] };
}

export const LibroVentasReport = ({ fechaInicio, fechaFin }: Rango) => {
    const { data, loading, error } = useReporte<LibroResp>('libro-ventas', { fechaInicio, fechaFin });
    const [filtro, setFiltro] = useState<'TODOS' | 'FISCAL' | 'NO_FISCAL' | 'SIN_COMPROBANTE' | 'ANULADAS'>('TODOS');

    const filas = (data?.filas ?? []).filter(f => filtro === 'TODOS' ? true : filtro === 'ANULADAS' ? f.anulada : f.comprobante === filtro && !f.anulada);
    const etiqueta = { FISCAL: 'Fiscal', NO_FISCAL: 'Comercial', SIN_COMPROBANTE: 'Sin comprobante' } as const;

    const columnas: Columna<LibroResp['filas'][number]>[] = [
        { header: 'Fecha', render: f => fechaHora(f.fecha), excel: f => f.fecha?.slice(0, 19).replace('T', ' '), muted: true },
        { header: 'Venta', render: f => `#${f.ventaid}`, excel: f => f.ventaid },
        { header: 'Comprobante', render: f => f.anulada ? <Badge tone="danger">Anulada</Badge> : <Badge tone={f.comprobante === 'FISCAL' ? 'primary' : f.comprobante === 'NO_FISCAL' ? 'neutral' : 'warning'}>{etiqueta[f.comprobante]}</Badge>, excel: f => f.anulada ? 'ANULADA' : etiqueta[f.comprobante] },
        { header: 'Consecutivo', render: f => f.consecutivo ?? '—', excel: f => f.consecutivo },
        { header: 'Cliente', render: f => f.cliente, excel: f => f.cliente, strong: true },
        { header: 'RUC / Cédula', render: f => f.identificacion ?? '—', excel: f => f.identificacion, muted: true },
        { header: 'Tipo', render: f => f.tipoventa, excel: f => f.tipoventa, muted: true },
        { header: 'Descuento', align: 'right', render: f => <Cifra>{money(f.descuento)}</Cifra>, excel: f => f.descuento },
        { header: 'Total', align: 'right', render: f => <Cifra bold color={f.anulada ? 'var(--text-secondary)' : undefined}>{money(f.total)}</Cifra>, excel: f => f.total },
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Libro de ventas"
                descripcion="Facturas fiscales y comerciales con su consecutivo, incluidas las anuladas. Los números que faltan en la serie se señalan para su revisión."
                acciones={data && <BotonReporte onClick={() => descargarExcel(`libro-ventas-${hoyArchivo()}`, [aHoja('Libro de ventas', columnas, data.filas)])}>Excel</BotonReporte>}
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: `Fiscales (${data.resumen.fiscal.cantidad})`, value: money(data.resumen.fiscal.total), tone: 'primary' },
                        { label: `Comerciales (${data.resumen.noFiscal.cantidad})`, value: money(data.resumen.noFiscal.total) },
                        { label: `Sin comprobante (${data.resumen.sinComprobante.cantidad})`, value: money(data.resumen.sinComprobante.total), tone: 'warning' },
                        { label: `Anuladas (${data.resumen.anuladas.cantidad})`, value: money(data.resumen.anuladas.total), tone: 'danger' },
                        { label: 'Total vigente', value: money(data.resumen.totalVigente), tone: 'success' },
                    ]} />

                    {(data.faltantes.fiscal.length > 0 || data.faltantes.noFiscal.length > 0) && (
                        <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', border: '1px solid var(--accent-warning-border)', backgroundColor: 'var(--accent-warning-bg-light)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            <strong style={{ color: 'var(--accent-warning)' }}>Consecutivos faltantes en el rango</strong>
                            {data.faltantes.fiscal.length > 0 && <div style={{ marginTop: '0.35rem' }}>Fiscales: {data.faltantes.fiscal.join(', ')}</div>}
                            {data.faltantes.noFiscal.length > 0 && <div style={{ marginTop: '0.35rem' }}>Comerciales: {data.faltantes.noFiscal.join(', ')}</div>}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {([['TODOS', 'Todos'], ['FISCAL', 'Fiscales'], ['NO_FISCAL', 'Comerciales'], ['SIN_COMPROBANTE', 'Sin comprobante'], ['ANULADAS', 'Anuladas']] as const).map(([k, l]) => (
                            <button key={k} className="btn" onClick={() => setFiltro(k)} style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem', fontWeight: 600, border: filtro === k ? '1px solid var(--accent-primary-border)' : '1px solid var(--border-color)', backgroundColor: filtro === k ? 'var(--accent-primary-bg)' : 'transparent', color: filtro === k ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{l}</button>
                        ))}
                    </div>
                    <TablaReporte columnas={columnas} filas={filas} />
                </>
            )}
        </div>
    );
};

// ─── Devoluciones y cambios ─────────────────────────────────────────────
interface Grupo { nombre: string; veces: number; unidades: number; monto: number }
interface DevolucionesResp {
    resumen: { devoluciones: number; unidades: number; monto: number; acreditado: number; reembolsado: number; cambios: number; porcentajeVentas: number };
    porProducto: Grupo[]; porMotivo: Grupo[]; porUsuario: Grupo[]; porTipo: Grupo[];
    detalle: { id: number; fecha: string; ventaid: number; producto: string; cantidad: number; monto: number; tipo: string; metodopago: string | null; acreditado: number; reembolsado: number; motivo: string; usuario: string }[];
}

export const DevolucionesReport = ({ fechaInicio, fechaFin }: Rango) => {
    const { data, loading, error } = useReporte<DevolucionesResp>('devoluciones', { fechaInicio, fechaFin });

    const columnasGrupo = (titulo: string): Columna<Grupo>[] => [
        { header: titulo, render: f => f.nombre, excel: f => f.nombre, strong: true },
        { header: 'Veces', align: 'right', render: f => f.veces, excel: f => f.veces },
        { header: 'Unidades', align: 'right', render: f => num(f.unidades), excel: f => f.unidades },
        { header: 'Monto', align: 'right', render: f => <Cifra bold>{money(f.monto)}</Cifra>, excel: f => f.monto },
    ];
    const columnasDetalle: Columna<DevolucionesResp['detalle'][number]>[] = [
        { header: 'Fecha', render: f => fechaHora(f.fecha), excel: f => f.fecha?.slice(0, 19).replace('T', ' '), muted: true },
        { header: 'Venta', render: f => `#${f.ventaid}`, excel: f => f.ventaid },
        { header: 'Producto', render: f => f.producto, excel: f => f.producto, strong: true },
        { header: 'Cant.', align: 'right', render: f => num(f.cantidad), excel: f => f.cantidad },
        { header: 'Monto', align: 'right', render: f => <Cifra bold>{money(f.monto)}</Cifra>, excel: f => f.monto },
        { header: 'Tipo', render: f => <Badge tone={f.tipo === 'CAMBIO' ? 'warning' : 'primary'}>{f.tipo === 'CAMBIO' ? 'Cambio' : 'Reembolso'}</Badge>, excel: f => f.tipo },
        { header: 'Compensación', render: f => [f.acreditado > 0 ? `Deuda ${money(f.acreditado)}` : '', f.reembolsado > 0 ? `${f.metodopago ?? 'Reembolso'} ${money(f.reembolsado)}` : ''].filter(Boolean).join(' · ') || '—', excel: f => `${f.acreditado}/${f.reembolsado}` },
        { header: 'Motivo', render: f => f.motivo, excel: f => f.motivo, muted: true },
        { header: 'Usuario', render: f => f.usuario, excel: f => f.usuario, muted: true },
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Devoluciones y cambios"
                descripcion="Qué se devuelve, por qué y quién lo registra: útil para detectar productos problemáticos y abusos."
                acciones={data && <BotonReporte onClick={() => descargarExcel(`devoluciones-${hoyArchivo()}`, [
                    aHoja('Detalle', columnasDetalle, data.detalle), aHoja('Por producto', columnasGrupo('Producto'), data.porProducto),
                    aHoja('Por motivo', columnasGrupo('Motivo'), data.porMotivo), aHoja('Por usuario', columnasGrupo('Usuario'), data.porUsuario),
                ])}>Excel</BotonReporte>}
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Devoluciones', value: data.resumen.devoluciones, tone: 'primary' },
                        { label: 'Monto devuelto', value: money(data.resumen.monto), tone: 'danger' },
                        { label: '% sobre ventas', value: `${num(data.resumen.porcentajeVentas, 2)} %` },
                        { label: 'Descontado de deuda', value: money(data.resumen.acreditado) },
                        { label: 'Reembolsado', value: money(data.resumen.reembolsado) },
                        { label: 'Cambios', value: data.resumen.cambios },
                    ]} />
                    <Seccion titulo="Por producto"><TablaReporte columnas={columnasGrupo('Producto')} filas={data.porProducto} /></Seccion>
                    <Seccion titulo="Por motivo"><TablaReporte columnas={columnasGrupo('Motivo')} filas={data.porMotivo} /></Seccion>
                    <Seccion titulo="Por usuario"><TablaReporte columnas={columnasGrupo('Usuario')} filas={data.porUsuario} /></Seccion>
                    <Seccion titulo="Detalle"><TablaReporte columnas={columnasDetalle} filas={data.detalle} /></Seccion>
                </>
            )}
        </div>
    );
};
