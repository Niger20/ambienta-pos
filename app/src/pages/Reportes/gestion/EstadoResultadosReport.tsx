import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SummaryCards } from '../../HR/ui';
import { fmtDate, money, num } from '../../HR/utils';
import { useReporte } from './useReporte';
import { descargarExcel, hoyArchivo } from './export';
import { BotonReporte, EstadoCarga, ReporteHeader } from './parts';

interface Gasto { categoria: string; monto: number }
interface Estado {
    ventasBrutas: number; devoluciones: number; ventasNetas: number; costoVentas: number; utilidadBruta: number; margenBruto: number;
    gastosOperativos: Gasto[]; totalGastosOperativos: number;
    nomina: { sueldos: number; horasExtra: number; otrosIngresos: number; inssPatronal: number; total: number };
    provisiones: { vacaciones: number; decimoTercerMes: number; indemnizacion: number; total: number };
    mermas: number; utilidadOperativa: number; margenOperativo: number;
}
interface Respuesta {
    periodo: { inicio: string; fin: string };
    periodoAnterior: { inicio: string; fin: string };
    actual: Estado;
    anterior: Estado;
}

type Tipo = 'seccion' | 'detalle' | 'subtotal' | 'total';
interface Linea { etiqueta: string; tipo: Tipo; actual?: number; anterior?: number }

/** Arma las líneas del estado; los egresos se muestran como "(−)" con su valor positivo. */
function construirLineas(a: Estado, p: Estado): Linea[] {
    const categorias = [...new Set([...a.gastosOperativos.map(g => g.categoria), ...p.gastosOperativos.map(g => g.categoria)])];
    const montoCategoria = (e: Estado, c: string) => e.gastosOperativos.find(g => g.categoria === c)?.monto ?? 0;

    return [
        { etiqueta: 'Ventas brutas', tipo: 'detalle', actual: a.ventasBrutas, anterior: p.ventasBrutas },
        { etiqueta: '(−) Devoluciones', tipo: 'detalle', actual: a.devoluciones, anterior: p.devoluciones },
        { etiqueta: 'Ventas netas', tipo: 'subtotal', actual: a.ventasNetas, anterior: p.ventasNetas },
        { etiqueta: '(−) Costo de ventas', tipo: 'detalle', actual: a.costoVentas, anterior: p.costoVentas },
        { etiqueta: 'Utilidad bruta', tipo: 'subtotal', actual: a.utilidadBruta, anterior: p.utilidadBruta },
        { etiqueta: 'Gastos operativos', tipo: 'seccion' },
        ...categorias.map(c => ({ etiqueta: c, tipo: 'detalle' as Tipo, actual: montoCategoria(a, c), anterior: montoCategoria(p, c) })),
        { etiqueta: '(−) Total gastos operativos', tipo: 'subtotal', actual: a.totalGastosOperativos, anterior: p.totalGastosOperativos },
        { etiqueta: 'Nómina', tipo: 'seccion' },
        { etiqueta: 'Sueldos devengados', tipo: 'detalle', actual: a.nomina.sueldos, anterior: p.nomina.sueldos },
        { etiqueta: 'Horas extra', tipo: 'detalle', actual: a.nomina.horasExtra, anterior: p.nomina.horasExtra },
        { etiqueta: 'Comisiones y otros ingresos', tipo: 'detalle', actual: a.nomina.otrosIngresos, anterior: p.nomina.otrosIngresos },
        { etiqueta: 'INSS patronal', tipo: 'detalle', actual: a.nomina.inssPatronal, anterior: p.nomina.inssPatronal },
        { etiqueta: '(−) Total nómina', tipo: 'subtotal', actual: a.nomina.total, anterior: p.nomina.total },
        { etiqueta: 'Provisiones laborales', tipo: 'seccion' },
        { etiqueta: 'Vacaciones', tipo: 'detalle', actual: a.provisiones.vacaciones, anterior: p.provisiones.vacaciones },
        { etiqueta: 'Décimo tercer mes', tipo: 'detalle', actual: a.provisiones.decimoTercerMes, anterior: p.provisiones.decimoTercerMes },
        { etiqueta: 'Indemnización', tipo: 'detalle', actual: a.provisiones.indemnizacion, anterior: p.provisiones.indemnizacion },
        { etiqueta: '(−) Total provisiones', tipo: 'subtotal', actual: a.provisiones.total, anterior: p.provisiones.total },
        { etiqueta: '(−) Mermas y pérdidas de inventario', tipo: 'detalle', actual: a.mermas, anterior: p.mermas },
        { etiqueta: 'Resultado operativo', tipo: 'total', actual: a.utilidadOperativa, anterior: p.utilidadOperativa },
    ];
}

const variacion = (actual = 0, anterior = 0): number | null => (anterior !== 0 ? ((actual - anterior) / Math.abs(anterior)) * 100 : null);

export const EstadoResultadosReport = ({ fechaInicio, fechaFin }: { fechaInicio: string; fechaFin: string }) => {
    const { data, loading, error } = useReporte<Respuesta>('estado-resultados', { fechaInicio, fechaFin });

    const lineas = data ? construirLineas(data.actual, data.anterior) : [];
    const periodoTexto = data ? `${fmtDate(data.periodo.inicio)} al ${fmtDate(data.periodo.fin)}` : '';
    const anteriorTexto = data ? `${fmtDate(data.periodoAnterior.inicio)} al ${fmtDate(data.periodoAnterior.fin)}` : '';
    const ventasNetas = data?.actual.ventasNetas ?? 0;
    const pct = (v?: number) => (v != null && ventasNetas > 0 ? `${num((v / ventasNetas) * 100, 1)} %` : '');

    const exportarExcel = () => {
        if (!data) return;
        descargarExcel(`estado-resultados-${hoyArchivo()}`, [{
            nombre: 'Estado de resultados',
            filas: [
                ['Concepto', `Actual (${periodoTexto})`, '% ventas netas', `Anterior (${anteriorTexto})`, 'Variación %'],
                ...lineas.map(l => l.actual == null
                    ? [l.etiqueta, null, null, null, null]
                    : [l.etiqueta, l.actual, ventasNetas > 0 ? Math.round((l.actual / ventasNetas) * 10000) / 100 : null, l.anterior ?? 0, variacion(l.actual, l.anterior) != null ? Math.round(variacion(l.actual, l.anterior)! * 100) / 100 : null]),
            ],
        }]);
    };

    const exportarPdf = () => {
        if (!data) return;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Estado de Resultados', 14, 18);
        doc.setFontSize(10);
        doc.text(`Período: ${periodoTexto}   |   Comparado con: ${anteriorTexto}`, 14, 25);
        autoTable(doc, {
            startY: 31,
            head: [['Concepto', 'Actual', '% ventas', 'Anterior', 'Variación']],
            body: lineas.map(l => [
                l.etiqueta,
                l.actual == null ? '' : money(l.actual),
                l.actual == null ? '' : pct(l.actual),
                l.anterior == null ? '' : money(l.anterior),
                l.actual == null || variacion(l.actual, l.anterior) == null ? '' : `${num(variacion(l.actual, l.anterior), 1)} %`,
            ]),
            styles: { fontSize: 9 },
            headStyles: { fillColor: [15, 23, 42] },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
            didParseCell: (hook) => {
                const linea = lineas[hook.row.index];
                if (hook.section === 'body' && linea && (linea.tipo === 'subtotal' || linea.tipo === 'total' || linea.tipo === 'seccion')) hook.cell.styles.fontStyle = 'bold';
            },
        });
        doc.save(`estado-resultados-${hoyArchivo()}.pdf`);
    };

    return (
        <div className="card">
            <ReporteHeader
                titulo="Estado de Resultados"
                descripcion="Ventas netas de devoluciones, costo de ventas, gastos, nómina, provisiones y mermas, comparado con el período anterior de igual duración."
                acciones={data && (
                    <>
                        <BotonReporte onClick={exportarExcel}>Excel</BotonReporte>
                        <BotonReporte onClick={exportarPdf}>PDF</BotonReporte>
                    </>
                )}
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Ventas netas', value: money(data.actual.ventasNetas), tone: 'primary' },
                        { label: `Utilidad bruta (${num(data.actual.margenBruto, 1)} %)`, value: money(data.actual.utilidadBruta), tone: 'success' },
                        { label: `Resultado operativo (${num(data.actual.margenOperativo, 1)} %)`, value: money(data.actual.utilidadOperativa), tone: data.actual.utilidadOperativa >= 0 ? 'success' : 'danger' },
                    ]} />

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'right' }}>
                                    <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem 0.75rem 0', fontWeight: 500 }}>Concepto</th>
                                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Actual<div style={{ fontSize: '0.7rem' }}>{periodoTexto}</div></th>
                                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>% ventas netas</th>
                                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Anterior<div style={{ fontSize: '0.7rem' }}>{anteriorTexto}</div></th>
                                    <th style={{ padding: '0.75rem 0 0.75rem 0.5rem', fontWeight: 500 }}>Variación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineas.map((l, i) => {
                                    const v = l.actual != null ? variacion(l.actual, l.anterior) : null;
                                    const resaltada = l.tipo === 'total';
                                    const fuerte = l.tipo === 'subtotal' || l.tipo === 'total';
                                    return (
                                        <tr key={i} style={{
                                            borderBottom: '1px solid var(--border-color)',
                                            backgroundColor: resaltada ? 'var(--accent-primary-bg)' : l.tipo === 'seccion' ? 'var(--bg-dark)' : undefined,
                                            fontWeight: fuerte || l.tipo === 'seccion' ? 700 : 400,
                                        }}>
                                            <td style={{ padding: '0.7rem 0.5rem 0.7rem ' + (l.tipo === 'detalle' ? '1.25rem' : '0'), color: l.tipo === 'seccion' ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{l.etiqueta}</td>
                                            <td className="tabular" style={{ padding: '0.7rem 0.5rem', textAlign: 'right', color: resaltada && (l.actual ?? 0) < 0 ? 'var(--accent-danger)' : undefined }}>{l.actual != null ? money(l.actual) : ''}</td>
                                            <td className="tabular" style={{ padding: '0.7rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{l.actual != null ? pct(l.actual) : ''}</td>
                                            <td className="tabular" style={{ padding: '0.7rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{l.anterior != null ? money(l.anterior) : ''}</td>
                                            <td className="tabular" style={{ padding: '0.7rem 0 0.7rem 0.5rem', textAlign: 'right', color: v == null ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{v != null ? `${v > 0 ? '+' : ''}${num(v, 1)} %` : l.actual != null ? '—' : ''}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '1rem' }}>
                        Ventas, costo, nómina y provisiones se reconocen por devengo en el período; los gastos operativos, por fecha de pago. Las cotizaciones no cuentan como venta. El costo de ventas usa el precio de compra vigente del producto.
                    </p>
                </>
            )}
        </div>
    );
};
