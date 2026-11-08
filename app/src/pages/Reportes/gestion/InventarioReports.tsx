import { useMemo, useState } from 'react';
import { Badge, SearchBox, SummaryCards } from '../../HR/ui';
import { fmtDate, money, num } from '../../HR/utils';
import { useReporte } from './useReporte';
import { descargarExcel, hoyArchivo } from './export';
import { BotonReporte, Cifra, EstadoCarga, ReporteHeader, Seccion, TablaReporte } from './parts';
import { aHoja } from './columnas';
import type { Columna } from './columnas';

interface Rango { fechaInicio: string; fechaFin: string }

const SelectorDias = ({ valor, onChange, opciones }: { valor: number; onChange: (n: number) => void; opciones: number[] }) => (
    <select className="form-input" value={valor} onChange={e => onChange(Number(e.target.value))} style={{ height: '34px', padding: '0 10px', width: 'auto' }}>
        {opciones.map(d => <option key={d} value={d}>{d} días</option>)}
    </select>
);

// ─── Valorización de inventario, rotación y ABC ─────────────────────────
interface ValorizacionResp {
    dias: number;
    resumen: { productos: number; unidades: number; valorCosto: number; valorVenta: number; utilidadPotencial: number };
    porCategoria: { categoria: string; productos: number; unidades: number; valorCosto: number; valorVenta: number; utilidadPotencial: number; participacion: number }[];
    abc: { clase: string; productos: number; valorCosto: number }[];
    productos: { productoid: number; nombre: string; categoria: string; stock: number; costoUnitario: number; valorCosto: number; valorVenta: number; vendidas: number; ventasValor: number; rotacion: number | null; diasInventario: number | null; abc: string }[];
}

export const ValorizacionReport = () => {
    const [dias, setDias] = useState(90);
    const [busqueda, setBusqueda] = useState('');
    const { data, loading, error } = useReporte<ValorizacionResp>('valorizacion-inventario', { dias });

    const filas = useMemo(() => (data?.productos ?? []).filter(p => !busqueda || `${p.nombre} ${p.categoria}`.toLowerCase().includes(busqueda.toLowerCase())), [data, busqueda]);
    const nombreAbc: Record<string, string> = { A: 'A · alta rotación de ventas', B: 'B · intermedia', C: 'C · baja', SIN_VENTAS: 'Sin ventas en el período' };

    const columnasCategoria: Columna<ValorizacionResp['porCategoria'][number]>[] = [
        { header: 'Categoría', render: f => f.categoria, excel: f => f.categoria, strong: true },
        { header: 'Productos', align: 'right', render: f => f.productos, excel: f => f.productos },
        { header: 'Unidades', align: 'right', render: f => num(f.unidades), excel: f => f.unidades },
        { header: 'Valor a costo', align: 'right', render: f => <Cifra bold>{money(f.valorCosto)}</Cifra>, excel: f => f.valorCosto },
        { header: 'Valor de venta', align: 'right', render: f => <Cifra>{money(f.valorVenta)}</Cifra>, excel: f => f.valorVenta },
        { header: 'Utilidad potencial', align: 'right', render: f => <Cifra color="var(--accent-success)">{money(f.utilidadPotencial)}</Cifra>, excel: f => f.utilidadPotencial },
        { header: '% del inventario', align: 'right', render: f => `${num(f.participacion, 1)} %`, excel: f => f.participacion },
    ];
    const columnasProducto: Columna<ValorizacionResp['productos'][number]>[] = [
        { header: 'Producto', render: f => f.nombre, excel: f => f.nombre, strong: true },
        { header: 'Categoría', render: f => f.categoria, excel: f => f.categoria, muted: true },
        { header: 'Stock', align: 'right', render: f => num(f.stock), excel: f => f.stock },
        { header: 'Valor a costo', align: 'right', render: f => <Cifra bold>{money(f.valorCosto)}</Cifra>, excel: f => f.valorCosto },
        { header: `Vendidas (${dias} d)`, align: 'right', render: f => num(f.vendidas), excel: f => f.vendidas },
        { header: 'Rotación', align: 'right', render: f => f.rotacion != null ? `${num(f.rotacion, 2)}x` : '—', excel: f => f.rotacion },
        { header: 'Días de inventario', align: 'right', render: f => f.diasInventario != null ? f.diasInventario : '—', excel: f => f.diasInventario },
        { header: 'ABC', render: f => <Badge tone={f.abc === 'A' ? 'success' : f.abc === 'B' ? 'primary' : f.abc === 'C' ? 'warning' : 'neutral'}>{f.abc === 'SIN_VENTAS' ? 'Sin ventas' : f.abc}</Badge>, excel: f => f.abc },
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Valorización de inventario y rotación"
                descripcion="Capital invertido por categoría, cuántas veces rota el stock y clasificación ABC según el valor vendido (A = productos que generan el 80 % de las ventas)."
                acciones={
                    <>
                        <SelectorDias valor={dias} onChange={setDias} opciones={[30, 60, 90, 180, 365]} />
                        {data && <BotonReporte onClick={() => descargarExcel(`inventario-valorizacion-${hoyArchivo()}`, [aHoja('Por categoría', columnasCategoria, data.porCategoria), aHoja('Productos', columnasProducto, data.productos)])}>Excel</BotonReporte>}
                    </>
                }
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Valor a costo', value: money(data.resumen.valorCosto), tone: 'primary' },
                        { label: 'Valor de venta', value: money(data.resumen.valorVenta) },
                        { label: 'Utilidad potencial', value: money(data.resumen.utilidadPotencial), tone: 'success' },
                        { label: 'Unidades en stock', value: num(data.resumen.unidades) },
                    ]} />
                    <Seccion titulo="Por categoría"><TablaReporte columnas={columnasCategoria} filas={data.porCategoria} /></Seccion>
                    <Seccion titulo="Clasificación ABC">
                        <TablaReporte
                            columnas={[
                                { header: 'Clase', render: f => nombreAbc[f.clase] ?? f.clase, strong: true },
                                { header: 'Productos', align: 'right', render: f => f.productos },
                                { header: 'Capital a costo', align: 'right', render: f => <Cifra bold>{money(f.valorCosto)}</Cifra> },
                            ]}
                            filas={data.abc}
                        />
                    </Seccion>
                    <Seccion titulo="Productos">
                        <div style={{ marginBottom: '0.75rem' }}><SearchBox value={busqueda} onChange={setBusqueda} placeholder="Buscar producto o categoría..." /></div>
                        <TablaReporte columnas={columnasProducto} filas={filas} />
                    </Seccion>
                </>
            )}
        </div>
    );
};

// ─── Productos por vencer ───────────────────────────────────────────────
interface VencerResp {
    dias: number;
    resumen: { vencidos: number; porVencer: number; valorEnRiesgo: number };
    tramos: { tramo: string; productos: number; unidades: number; valorCosto: number }[];
    productos: { productoid: number; nombre: string; categoria: string; fechavencimiento: string; diasRestantes: number; tramo: string; stock: number; valorCosto: number; valorVenta: number }[];
}

export const PorVencerReport = () => {
    const [dias, setDias] = useState(60);
    const { data, loading, error } = useReporte<VencerResp>('productos-por-vencer', { dias });

    const columnas: Columna<VencerResp['productos'][number]>[] = [
        { header: 'Producto', render: f => f.nombre, excel: f => f.nombre, strong: true },
        { header: 'Categoría', render: f => f.categoria, excel: f => f.categoria, muted: true },
        { header: 'Vence', render: f => fmtDate(f.fechavencimiento), excel: f => f.fechavencimiento },
        { header: 'Días', align: 'right', render: f => f.diasRestantes < 0 ? `Venció hace ${-f.diasRestantes}` : f.diasRestantes, excel: f => f.diasRestantes },
        { header: 'Estado', render: f => <Badge tone={f.tramo === 'VENCIDO' ? 'danger' : f.tramo === '0-7' ? 'danger' : f.tramo === '8-15' ? 'warning' : 'neutral'}>{f.tramo === 'VENCIDO' ? 'Vencido' : `${f.tramo} días`}</Badge>, excel: f => f.tramo },
        { header: 'Stock', align: 'right', render: f => num(f.stock), excel: f => f.stock },
        { header: 'Valor a costo', align: 'right', render: f => <Cifra bold>{money(f.valorCosto)}</Cifra>, excel: f => f.valorCosto },
        { header: 'Valor de venta', align: 'right', render: f => <Cifra>{money(f.valorVenta)}</Cifra>, excel: f => f.valorVenta },
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Productos por vencer"
                descripcion="Productos con fecha de vencimiento (y stock) que ya vencieron o vencen dentro del plazo elegido."
                acciones={
                    <>
                        <SelectorDias valor={dias} onChange={setDias} opciones={[7, 15, 30, 60, 90, 180]} />
                        {data && <BotonReporte onClick={() => descargarExcel(`productos-por-vencer-${hoyArchivo()}`, [aHoja('Por vencer', columnas, data.productos)])}>Excel</BotonReporte>}
                    </>
                }
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Vencidos con stock', value: data.resumen.vencidos, tone: data.resumen.vencidos > 0 ? 'danger' : 'default' },
                        { label: `Vencen en ${data.dias} días`, value: data.resumen.porVencer, tone: 'warning' },
                        { label: 'Capital en riesgo (costo)', value: money(data.resumen.valorEnRiesgo), tone: 'danger' },
                    ]} />
                    <TablaReporte columnas={columnas} filas={data.productos} vacio="No hay productos vencidos ni por vencer en el plazo elegido." />
                </>
            )}
        </div>
    );
};

// ─── Inventario sin movimiento ──────────────────────────────────────────
interface SinMovResp {
    dias: number;
    resumen: { productos: number; nuncaVendidos: number; capitalDetenido: number; porcentajeInventario: number };
    productos: { productoid: number; nombre: string; categoria: string; stock: number; valorCosto: number; valorVenta: number; ultimaVenta: string | null; ultimaCompra: string | null; diasSinVenta: number | null }[];
}

export const SinMovimientoReport = () => {
    const [dias, setDias] = useState(60);
    const { data, loading, error } = useReporte<SinMovResp>('inventario-sin-movimiento', { dias });

    const columnas: Columna<SinMovResp['productos'][number]>[] = [
        { header: 'Producto', render: f => f.nombre, excel: f => f.nombre, strong: true },
        { header: 'Categoría', render: f => f.categoria, excel: f => f.categoria, muted: true },
        { header: 'Stock', align: 'right', render: f => num(f.stock), excel: f => f.stock },
        { header: 'Capital a costo', align: 'right', render: f => <Cifra bold>{money(f.valorCosto)}</Cifra>, excel: f => f.valorCosto },
        { header: 'Última venta', render: f => f.ultimaVenta ? fmtDate(f.ultimaVenta) : <Badge tone="danger">Nunca</Badge>, excel: f => f.ultimaVenta?.slice(0, 10) ?? 'Nunca', muted: true },
        { header: 'Días sin vender', align: 'right', render: f => f.diasSinVenta ?? '—', excel: f => f.diasSinVenta },
        { header: 'Última compra', render: f => f.ultimaCompra ? fmtDate(f.ultimaCompra) : '—', excel: f => f.ultimaCompra?.slice(0, 10) ?? '', muted: true },
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Inventario sin movimiento"
                descripcion="Productos con stock que no se han vendido en el plazo elegido: capital detenido que conviene rematar, devolver o dejar de comprar."
                acciones={
                    <>
                        <SelectorDias valor={dias} onChange={setDias} opciones={[30, 60, 90, 180, 365]} />
                        {data && <BotonReporte onClick={() => descargarExcel(`inventario-sin-movimiento-${hoyArchivo()}`, [aHoja('Sin movimiento', columnas, data.productos)])}>Excel</BotonReporte>}
                    </>
                }
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Productos sin vender', value: data.resumen.productos, tone: 'primary' },
                        { label: 'Nunca vendidos', value: data.resumen.nuncaVendidos, tone: 'warning' },
                        { label: 'Capital detenido (costo)', value: money(data.resumen.capitalDetenido), tone: 'danger' },
                        { label: '% del inventario', value: `${num(data.resumen.porcentajeInventario, 1)} %` },
                    ]} />
                    <TablaReporte columnas={columnas} filas={data.productos} vacio="Todos los productos con stock tuvieron ventas en el plazo elegido." />
                </>
            )}
        </div>
    );
};

// ─── Mermas y pérdidas ──────────────────────────────────────────────────
interface Grupo { nombre: string; veces: number; unidades: number; neto: number }
interface MermasResp {
    resumen: { registros: number; perdidaBruta: number; recuperado: number; perdidaNeta: number };
    porProducto: Grupo[]; porMotivo: Grupo[]; porUsuario: Grupo[];
    detalle: { id: number; fecha: string; producto: string; cantidad: number; costoUnitario: number; perdida: number; recuperado: number; neto: number; convertidoA: string | null; motivo: string; usuario: string }[];
}

export const MermasReport = ({ fechaInicio, fechaFin }: Rango) => {
    const { data, loading, error } = useReporte<MermasResp>('mermas', { fechaInicio, fechaFin });

    const columnasGrupo = (titulo: string): Columna<Grupo>[] => [
        { header: titulo, render: f => f.nombre, excel: f => f.nombre, strong: true },
        { header: 'Veces', align: 'right', render: f => f.veces, excel: f => f.veces },
        { header: 'Unidades', align: 'right', render: f => num(f.unidades), excel: f => f.unidades },
        { header: 'Pérdida neta', align: 'right', render: f => <Cifra bold color="var(--accent-danger)">{money(f.neto)}</Cifra>, excel: f => f.neto },
    ];
    const columnasDetalle: Columna<MermasResp['detalle'][number]>[] = [
        { header: 'Fecha', render: f => fmtDate(f.fecha), excel: f => f.fecha?.slice(0, 10), muted: true },
        { header: 'Producto', render: f => f.producto, excel: f => f.producto, strong: true },
        { header: 'Cant.', align: 'right', render: f => num(f.cantidad), excel: f => f.cantidad },
        { header: 'Pérdida', align: 'right', render: f => <Cifra>{money(f.perdida)}</Cifra>, excel: f => f.perdida },
        { header: 'Recuperado', align: 'right', render: f => <Cifra>{money(f.recuperado)}</Cifra>, excel: f => f.recuperado },
        { header: 'Neto', align: 'right', render: f => <Cifra bold color="var(--accent-danger)">{money(f.neto)}</Cifra>, excel: f => f.neto },
        { header: 'Convertido a', render: f => f.convertidoA ?? '—', excel: f => f.convertidoA, muted: true },
        { header: 'Motivo', render: f => f.motivo, excel: f => f.motivo, muted: true },
        { header: 'Usuario', render: f => f.usuario, excel: f => f.usuario, muted: true },
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Mermas y pérdidas"
                descripcion="Producto dado de baja, valorado a su costo. Si la merma se convirtió en otro producto, se descuenta el valor recuperado."
                acciones={data && <BotonReporte onClick={() => descargarExcel(`mermas-${hoyArchivo()}`, [aHoja('Detalle', columnasDetalle, data.detalle), aHoja('Por producto', columnasGrupo('Producto'), data.porProducto), aHoja('Por motivo', columnasGrupo('Motivo'), data.porMotivo)])}>Excel</BotonReporte>}
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Registros', value: data.resumen.registros, tone: 'primary' },
                        { label: 'Pérdida bruta', value: money(data.resumen.perdidaBruta) },
                        { label: 'Valor recuperado', value: money(data.resumen.recuperado), tone: 'success' },
                        { label: 'Pérdida neta', value: money(data.resumen.perdidaNeta), tone: 'danger' },
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
