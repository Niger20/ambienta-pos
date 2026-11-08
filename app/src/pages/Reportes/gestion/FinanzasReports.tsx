import { useState } from 'react';
import { Badge, SummaryCards } from '../../HR/ui';
import { fmtDate, labelize, money } from '../../HR/utils';
import { useReporte } from './useReporte';
import { descargarExcel, hoyArchivo } from './export';
import { BotonReporte, Cifra, EstadoCarga, ReporteHeader, Seccion, TablaReporte } from './parts';
import { aHoja, negativoRojo } from './columnas';
import type { Columna } from './columnas';

interface Rango { fechaInicio: string; fechaFin: string }

const NOMBRE_METODO: Record<string, string> = { EFECTIVO: 'Efectivo', BAC: 'Banco BAC', LAFISE: 'Banco LAFISE', TARJETA: 'Tarjetas / POS', OTRO: 'Otras transferencias' };

// ─── Flujo de caja por método de pago ───────────────────────────────────
interface Celda {
    entradasVentas: number; entradasAbonos: number; salidasCompras: number; salidasPagos: number; salidasReembolsos: number;
    entradas: number; salidas: number; neto: number;
}
interface FlujoResp {
    agrupar: 'dia' | 'mes';
    totales: { entradas: number; salidas: number; neto: number };
    metodos: (Celda & { metodo: string })[];
    periodos: { periodo: string; entradas: number; salidas: number; neto: number; metodos: Record<string, Celda> }[];
}

export const FlujoCajaReport = ({ fechaInicio, fechaFin }: Rango) => {
    const [agrupar, setAgrupar] = useState<'dia' | 'mes'>('dia');
    const { data, loading, error } = useReporte<FlujoResp>('flujo-caja', { fechaInicio, fechaFin, agrupar });

    const columnasMetodo: Columna<FlujoResp['metodos'][number]>[] = [
        { header: 'Método', render: f => NOMBRE_METODO[f.metodo] ?? f.metodo, excel: f => NOMBRE_METODO[f.metodo] ?? f.metodo, strong: true },
        { header: 'Ventas', align: 'right', render: f => <Cifra>{money(f.entradasVentas)}</Cifra>, excel: f => f.entradasVentas },
        { header: 'Abonos', align: 'right', render: f => <Cifra>{money(f.entradasAbonos)}</Cifra>, excel: f => f.entradasAbonos },
        { header: 'Total entradas', align: 'right', render: f => <Cifra bold color="var(--accent-success)">{money(f.entradas)}</Cifra>, excel: f => f.entradas },
        { header: 'Compras', align: 'right', render: f => <Cifra>{money(f.salidasCompras)}</Cifra>, excel: f => f.salidasCompras },
        { header: 'Pagos y gastos', align: 'right', render: f => <Cifra>{money(f.salidasPagos)}</Cifra>, excel: f => f.salidasPagos },
        { header: 'Reembolsos', align: 'right', render: f => <Cifra>{money(f.salidasReembolsos)}</Cifra>, excel: f => f.salidasReembolsos },
        { header: 'Total salidas', align: 'right', render: f => <Cifra bold color="var(--accent-danger)">{money(f.salidas)}</Cifra>, excel: f => f.salidas },
        { header: 'Neto', align: 'right', render: f => <Cifra bold color={negativoRojo(f.neto)}>{money(f.neto)}</Cifra>, excel: f => f.neto },
    ];
    const columnasPeriodo: Columna<FlujoResp['periodos'][number]>[] = [
        { header: agrupar === 'mes' ? 'Mes' : 'Fecha', render: f => agrupar === 'mes' ? f.periodo : fmtDate(f.periodo), excel: f => f.periodo, strong: true },
        { header: 'Efectivo (neto)', align: 'right', render: f => <Cifra color={negativoRojo(f.metodos.EFECTIVO.neto)}>{money(f.metodos.EFECTIVO.neto)}</Cifra>, excel: f => f.metodos.EFECTIVO.neto },
        { header: 'BAC (neto)', align: 'right', render: f => <Cifra color={negativoRojo(f.metodos.BAC.neto)}>{money(f.metodos.BAC.neto)}</Cifra>, excel: f => f.metodos.BAC.neto },
        { header: 'LAFISE (neto)', align: 'right', render: f => <Cifra color={negativoRojo(f.metodos.LAFISE.neto)}>{money(f.metodos.LAFISE.neto)}</Cifra>, excel: f => f.metodos.LAFISE.neto },
        { header: 'Tarjeta (neto)', align: 'right', render: f => <Cifra color={negativoRojo(f.metodos.TARJETA.neto)}>{money(f.metodos.TARJETA.neto)}</Cifra>, excel: f => f.metodos.TARJETA.neto },
        { header: 'Entradas', align: 'right', render: f => <Cifra>{money(f.entradas)}</Cifra>, excel: f => f.entradas },
        { header: 'Salidas', align: 'right', render: f => <Cifra>{money(f.salidas)}</Cifra>, excel: f => f.salidas },
        { header: 'Neto', align: 'right', render: f => <Cifra bold color={negativoRojo(f.neto)}>{money(f.neto)}</Cifra>, excel: f => f.neto },
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Flujo de caja por método de pago"
                descripcion="Entradas (ventas y abonos) y salidas (compras al contado, pagos y reembolsos) separadas por efectivo, banco y tarjeta. Las notas de crédito por devolución no son dinero y no aparecen."
                acciones={
                    <>
                        <select className="form-input" value={agrupar} onChange={e => setAgrupar(e.target.value as 'dia' | 'mes')} style={{ height: '34px', padding: '0 10px', width: 'auto' }}>
                            <option value="dia">Por día</option>
                            <option value="mes">Por mes</option>
                        </select>
                        {data && <BotonReporte onClick={() => descargarExcel(`flujo-caja-${hoyArchivo()}`, [aHoja('Por método', columnasMetodo, data.metodos), aHoja('Por período', columnasPeriodo, data.periodos)])}>Excel</BotonReporte>}
                    </>
                }
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Entradas', value: money(data.totales.entradas), tone: 'success' },
                        { label: 'Salidas', value: money(data.totales.salidas), tone: 'danger' },
                        { label: 'Flujo neto', value: money(data.totales.neto), tone: data.totales.neto >= 0 ? 'primary' : 'danger' },
                    ]} />
                    <Seccion titulo="Resumen por método"><TablaReporte columnas={columnasMetodo} filas={data.metodos} /></Seccion>
                    <Seccion titulo="Evolución"><TablaReporte columnas={columnasPeriodo} filas={data.periodos} /></Seccion>
                </>
            )}
        </div>
    );
};

// ─── Antigüedad de saldos (CxC y CxP) ───────────────────────────────────
type Tramo = 'vigente' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90mas';
const ETIQUETA_TRAMO: Record<Tramo, string> = { vigente: 'Vigente', d1_30: '1-30 días', d31_60: '31-60 días', d61_90: '61-90 días', d90mas: 'Más de 90' };
const TRAMOS: Tramo[] = ['vigente', 'd1_30', 'd31_60', 'd61_90', 'd90mas'];

interface AntiguedadResp {
    tipo: 'cxc' | 'cxp';
    fechaCorte: string;
    totales: Record<Tramo | 'total', number>;
    filas: ({ nombre: string; telefono: string | null; cuentas: number; maxDias: number; total: number } & Record<Tramo, number>)[];
    detalle: { id: number; nombre: string; referencia: string; vencimiento: string; saldo: number; dias: number; tramo: Tramo }[];
}

export const AntiguedadSaldosReport = () => {
    const [tipo, setTipo] = useState<'cxc' | 'cxp'>('cxc');
    const [corte, setCorte] = useState(new Date().toISOString().slice(0, 10));
    const { data, loading, error } = useReporte<AntiguedadResp>('antiguedad-saldos', { tipo, fechaCorte: corte });
    const etiquetaEntidad = tipo === 'cxc' ? 'Cliente' : 'Proveedor';

    const columnas: Columna<AntiguedadResp['filas'][number]>[] = [
        { header: etiquetaEntidad, render: f => f.nombre, excel: f => f.nombre, strong: true },
        ...TRAMOS.map((t): Columna<AntiguedadResp['filas'][number]> => ({
            header: ETIQUETA_TRAMO[t], align: 'right',
            render: f => <Cifra color={f[t] > 0 && t !== 'vigente' ? 'var(--accent-danger)' : undefined}>{money(f[t])}</Cifra>,
            excel: f => f[t],
        })),
        { header: 'Total', align: 'right', render: f => <Cifra bold>{money(f.total)}</Cifra>, excel: f => f.total },
        { header: 'Cuentas', align: 'right', render: f => f.cuentas, excel: f => f.cuentas },
        { header: 'Mayor atraso', align: 'right', render: f => f.maxDias > 0 ? `${f.maxDias} d` : 'Al día', excel: f => f.maxDias },
    ];
    const columnasDetalle: Columna<AntiguedadResp['detalle'][number]>[] = [
        { header: etiquetaEntidad, render: f => f.nombre, excel: f => f.nombre, strong: true },
        { header: 'Referencia', render: f => f.referencia, excel: f => f.referencia, muted: true },
        { header: 'Vence', render: f => fmtDate(f.vencimiento), excel: f => f.vencimiento, muted: true },
        { header: 'Atraso', align: 'right', render: f => f.dias > 0 ? `${f.dias} d` : 'Vigente', excel: f => f.dias },
        { header: 'Tramo', render: f => <Badge tone={f.tramo === 'vigente' ? 'success' : f.tramo === 'd1_30' ? 'warning' : 'danger'}>{ETIQUETA_TRAMO[f.tramo]}</Badge>, excel: f => ETIQUETA_TRAMO[f.tramo] },
        { header: 'Saldo', align: 'right', render: f => <Cifra bold>{money(f.saldo)}</Cifra>, excel: f => f.saldo },
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Antigüedad de saldos"
                descripcion="Cuánto se debe y desde hace cuánto, según la fecha de vencimiento de cada cuenta. Sirve para priorizar cobros y pagos."
                acciones={
                    <>
                        <select className="form-input" value={tipo} onChange={e => setTipo(e.target.value as 'cxc' | 'cxp')} style={{ height: '34px', padding: '0 10px', width: 'auto' }}>
                            <option value="cxc">Cuentas por cobrar (clientes)</option>
                            <option value="cxp">Cuentas por pagar (proveedores)</option>
                        </select>
                        <input type="date" className="form-input" value={corte} onChange={e => setCorte(e.target.value)} style={{ height: '34px', padding: '0 10px', width: 'auto' }} title="Fecha de corte" />
                        {data && <BotonReporte onClick={() => descargarExcel(`antiguedad-${tipo}-${hoyArchivo()}`, [aHoja('Por ' + etiquetaEntidad.toLowerCase(), columnas, data.filas), aHoja('Detalle', columnasDetalle, data.detalle)])}>Excel</BotonReporte>}
                    </>
                }
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Saldo total', value: money(data.totales.total), tone: 'primary' },
                        { label: 'Vigente', value: money(data.totales.vigente), tone: 'success' },
                        { label: 'Vencido', value: money(data.totales.total - data.totales.vigente), tone: 'danger' },
                        { label: 'Más de 90 días', value: money(data.totales.d90mas), tone: data.totales.d90mas > 0 ? 'danger' : 'default' },
                    ]} />
                    <Seccion titulo={`Por ${labelize(etiquetaEntidad).toLowerCase()}`}><TablaReporte columnas={columnas} filas={data.filas} vacio="No hay saldos pendientes." /></Seccion>
                    <Seccion titulo="Detalle de cuentas"><TablaReporte columnas={columnasDetalle} filas={data.detalle} vacio="No hay saldos pendientes." /></Seccion>
                </>
            )}
        </div>
    );
};
