import { useState } from 'react';
import { Badge, FilterSelect, SummaryCards } from '../../HR/ui';
import { fmtDate, labelize, money, num } from '../../HR/utils';
import { useReporte } from './useReporte';
import { descargarExcel, hoyArchivo } from './export';
import { BotonReporte, Cifra, EstadoCarga, ReporteHeader, Seccion, TablaReporte } from './parts';
import { aHoja } from './columnas';
import type { Columna } from './columnas';

interface Rango { fechaInicio: string; fechaFin: string }

// ─── Costo laboral ──────────────────────────────────────────────────────
interface Costo { salario: number; horasExtra: number; otrosIngresos: number; inssPatronal: number; provisiones: number; costoTotal: number }
interface CostoLaboralResp {
    totales: Costo & { empleados: number };
    porPeriodo: (Costo & { periodoid: number; tipoperiodo: string; fechainicio: string; fechafin: string; estado: string })[];
    porEmpleado: (Costo & { empleadoid: number; nombre: string; cargo: string })[];
}

const columnasCosto = <T extends Costo>(): Columna<T>[] => [
    { header: 'Salario', align: 'right', render: f => <Cifra>{money(f.salario)}</Cifra>, excel: f => f.salario },
    { header: 'Horas extra', align: 'right', render: f => <Cifra>{money(f.horasExtra)}</Cifra>, excel: f => f.horasExtra },
    { header: 'Otros ingresos', align: 'right', render: f => <Cifra>{money(f.otrosIngresos)}</Cifra>, excel: f => f.otrosIngresos },
    { header: 'INSS patronal', align: 'right', render: f => <Cifra>{money(f.inssPatronal)}</Cifra>, excel: f => f.inssPatronal },
    { header: 'Provisiones', align: 'right', render: f => <Cifra>{money(f.provisiones)}</Cifra>, excel: f => f.provisiones },
    { header: 'Costo total', align: 'right', render: f => <Cifra bold>{money(f.costoTotal)}</Cifra>, excel: f => f.costoTotal },
];

export const CostoLaboralReport = ({ fechaInicio, fechaFin }: Rango) => {
    const { data, loading, error } = useReporte<CostoLaboralResp>('costo-laboral', { fechaInicio, fechaFin });

    const columnasPeriodo: Columna<CostoLaboralResp['porPeriodo'][number]>[] = [
        { header: 'Período', render: f => `${labelize(f.tipoperiodo)} ${fmtDate(f.fechainicio)} al ${fmtDate(f.fechafin)}`, excel: f => `${f.fechainicio.slice(0, 10)} a ${f.fechafin.slice(0, 10)}`, strong: true },
        { header: 'Estado', render: f => <Badge tone={f.estado === 'PAGADO' || f.estado === 'CERRADO' ? 'success' : 'primary'}>{labelize(f.estado)}</Badge>, excel: f => f.estado },
        ...columnasCosto<CostoLaboralResp['porPeriodo'][number]>(),
    ];
    const columnasEmpleado: Columna<CostoLaboralResp['porEmpleado'][number]>[] = [
        { header: 'Empleado', render: f => f.nombre, excel: f => f.nombre, strong: true },
        { header: 'Cargo', render: f => f.cargo, excel: f => f.cargo, muted: true },
        ...columnasCosto<CostoLaboralResp['porEmpleado'][number]>(),
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Costo laboral"
                descripcion="Lo que cuesta el personal: salarios devengados, horas extra, aporte patronal al INSS y provisiones. Considera planillas aprobadas, pagadas o cerradas cuyo período termina en el rango."
                acciones={data && <BotonReporte onClick={() => descargarExcel(`costo-laboral-${hoyArchivo()}`, [aHoja('Por empleado', columnasEmpleado, data.porEmpleado), aHoja('Por período', columnasPeriodo, data.porPeriodo)])}>Excel</BotonReporte>}
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Empleados', value: data.totales.empleados, tone: 'primary' },
                        { label: 'Salarios y extras', value: money(data.totales.salario + data.totales.horasExtra + data.totales.otrosIngresos) },
                        { label: 'INSS patronal', value: money(data.totales.inssPatronal) },
                        { label: 'Provisiones', value: money(data.totales.provisiones) },
                        { label: 'Costo laboral total', value: money(data.totales.costoTotal), tone: 'danger' },
                    ]} />
                    <Seccion titulo="Por empleado"><TablaReporte columnas={columnasEmpleado} filas={data.porEmpleado} vacio="No hay planillas aprobadas en el rango." /></Seccion>
                    <Seccion titulo="Por período"><TablaReporte columnas={columnasPeriodo} filas={data.porPeriodo} vacio="No hay planillas aprobadas en el rango." /></Seccion>
                </>
            )}
        </div>
    );
};

// ─── Pasivo laboral ─────────────────────────────────────────────────────
interface PasivoResp {
    totales: { empleados: number; vacaciones: number; decimoTercerMes: number; indemnizacion: number; total: number };
    empleados: { empleadoid: number; nombre: string; cargo: string; activo: boolean; diasVacacionesPendientes: number; vacaciones: number; decimoTercerMes: number; indemnizacion: number; total: number }[];
}

export const PasivoLaboralReport = () => {
    const { data, loading, error } = useReporte<PasivoResp>('pasivo-laboral');

    const columnas: Columna<PasivoResp['empleados'][number]>[] = [
        { header: 'Empleado', render: f => <>{f.nombre} {!f.activo && <Badge tone="danger">Inactivo</Badge>}</>, excel: f => f.nombre, strong: true },
        { header: 'Cargo', render: f => f.cargo, excel: f => f.cargo, muted: true },
        { header: 'Días de vacaciones', align: 'right', render: f => num(f.diasVacacionesPendientes), excel: f => f.diasVacacionesPendientes },
        { header: 'Vacaciones', align: 'right', render: f => <Cifra>{money(f.vacaciones)}</Cifra>, excel: f => f.vacaciones },
        { header: 'Décimo tercer mes', align: 'right', render: f => <Cifra>{money(f.decimoTercerMes)}</Cifra>, excel: f => f.decimoTercerMes },
        { header: 'Indemnización', align: 'right', render: f => <Cifra>{money(f.indemnizacion)}</Cifra>, excel: f => f.indemnizacion },
        { header: 'Total adeudado', align: 'right', render: f => <Cifra bold color={f.total > 0 ? 'var(--accent-danger)' : undefined}>{money(f.total)}</Cifra>, excel: f => f.total },
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Pasivo laboral"
                descripcion="Lo que la empresa ya acumuló y aún debe pagar a cada empleado por vacaciones, décimo tercer mes e indemnización, a la fecha de hoy."
                acciones={data && <BotonReporte onClick={() => descargarExcel(`pasivo-laboral-${hoyArchivo()}`, [aHoja('Pasivo laboral', columnas, data.empleados)])}>Excel</BotonReporte>}
            />
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Vacaciones por pagar', value: money(data.totales.vacaciones) },
                        { label: 'Décimo tercer mes', value: money(data.totales.decimoTercerMes) },
                        { label: 'Indemnización', value: money(data.totales.indemnizacion) },
                        { label: 'Pasivo laboral total', value: money(data.totales.total), tone: 'danger' },
                    ]} />
                    <TablaReporte columnas={columnas} filas={data.empleados} vacio="No hay acumulados registrados." />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '1rem' }}>
                        Se calcula con los acumulados generados en Recursos Humanos menos lo pagado (acumulado o pagos de beneficios). Si no hay acumulados generados, el pasivo aparece en cero.
                    </p>
                </>
            )}
        </div>
    );
};

// ─── Bitácora de auditoría ──────────────────────────────────────────────
interface BitacoraResp {
    resumen: { eventos: number; mostrados: number; ventasAnuladas: number; montoAnulado: number; sinUsuario: number };
    tablasDisponibles: string[];
    porUsuario: { usuario: string; insert: number; update: number; delete: number; total: number }[];
    porTabla: { nombre: string; cantidad: number }[];
    ventasAnuladas: { fecha: string; ventaid: number; total: number; tipoventa: string; usuario: string }[];
    ventasAnuladasPorUsuario: { usuario: string; anulaciones: number; monto: number }[];
    eventos: { id: number; fecha: string; usuario: string; tabla: string; operacion: string; registroid: unknown; cambios: { campo: string; antes: unknown; despues: unknown }[] }[];
}

const texto = (v: unknown) => (v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const tonoOperacion = (op: string) => (op === 'DELETE' ? 'danger' : op === 'INSERT' ? 'success' : 'primary') as 'danger' | 'success' | 'primary';

export const BitacoraReport = ({ fechaInicio, fechaFin }: Rango) => {
    const [tabla, setTabla] = useState('');
    const [operacion, setOperacion] = useState('');
    const { data, loading, error } = useReporte<BitacoraResp>('bitacora', { fechaInicio, fechaFin, tabla: tabla || undefined, operacion: operacion || undefined, limite: 300 });

    const columnasEvento: Columna<BitacoraResp['eventos'][number]>[] = [
        { header: 'Fecha', render: f => new Date(f.fecha).toLocaleString('es-NI'), excel: f => f.fecha?.slice(0, 19).replace('T', ' '), muted: true },
        { header: 'Usuario', render: f => f.usuario, excel: f => f.usuario, strong: true },
        { header: 'Tabla', render: f => f.tabla, excel: f => f.tabla },
        { header: 'Operación', render: f => <Badge tone={tonoOperacion(f.operacion)}>{f.operacion}</Badge>, excel: f => f.operacion },
        { header: 'Registro', render: f => texto(f.registroid), excel: f => texto(f.registroid), muted: true },
        {
            header: 'Cambios', render: f => f.cambios.length === 0 ? '—' : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.78rem' }}>
                    {f.cambios.map(c => <span key={c.campo}><strong>{c.campo}</strong>: {texto(c.antes)} → {texto(c.despues)}</span>)}
                </div>
            ),
            excel: f => f.cambios.map(c => `${c.campo}: ${texto(c.antes)} -> ${texto(c.despues)}`).join(' | '),
        },
    ];
    const columnasUsuario: Columna<BitacoraResp['porUsuario'][number]>[] = [
        { header: 'Usuario', render: f => f.usuario, excel: f => f.usuario, strong: true },
        { header: 'Altas', align: 'right', render: f => f.insert, excel: f => f.insert },
        { header: 'Modificaciones', align: 'right', render: f => f.update, excel: f => f.update },
        { header: 'Eliminaciones', align: 'right', render: f => f.delete, excel: f => f.delete },
        { header: 'Total', align: 'right', render: f => <Cifra bold>{f.total}</Cifra>, excel: f => f.total },
    ];
    const columnasAnuladas: Columna<BitacoraResp['ventasAnuladas'][number]>[] = [
        { header: 'Fecha', render: f => new Date(f.fecha).toLocaleString('es-NI'), excel: f => f.fecha?.slice(0, 19).replace('T', ' '), muted: true },
        { header: 'Venta', render: f => `#${f.ventaid}`, excel: f => f.ventaid },
        { header: 'Tipo', render: f => f.tipoventa, excel: f => f.tipoventa, muted: true },
        { header: 'Monto', align: 'right', render: f => <Cifra bold>{money(f.total)}</Cifra>, excel: f => f.total },
        { header: 'Anulada por', render: f => f.usuario, excel: f => f.usuario, strong: true },
    ];
    const columnasAnuladasUsuario: Columna<BitacoraResp['ventasAnuladasPorUsuario'][number]>[] = [
        { header: 'Usuario', render: f => f.usuario, excel: f => f.usuario, strong: true },
        { header: 'Ventas anuladas', align: 'right', render: f => f.anulaciones, excel: f => f.anulaciones },
        { header: 'Monto anulado', align: 'right', render: f => <Cifra bold color="var(--accent-danger)">{money(f.monto)}</Cifra>, excel: f => f.monto },
    ];

    return (
        <div className="card">
            <ReporteHeader
                titulo="Bitácora de auditoría"
                descripcion="Quién creó, modificó o eliminó registros (ventas, productos, compras, devoluciones, empleados, planilla, liquidaciones y préstamos) y quién anuló ventas."
                acciones={data && <BotonReporte onClick={() => descargarExcel(`bitacora-${hoyArchivo()}`, [aHoja('Eventos', columnasEvento, data.eventos), aHoja('Por usuario', columnasUsuario, data.porUsuario), aHoja('Ventas anuladas', columnasAnuladas, data.ventasAnuladas)])}>Excel</BotonReporte>}
            />
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <FilterSelect value={tabla} onChange={setTabla} allLabel="Todas las tablas" options={(data?.tablasDisponibles ?? []).map(t => ({ value: t, label: t }))} />
                <FilterSelect value={operacion} onChange={setOperacion} allLabel="Todas las operaciones" options={[{ value: 'INSERT', label: 'Altas' }, { value: 'UPDATE', label: 'Modificaciones' }, { value: 'DELETE', label: 'Eliminaciones' }]} />
            </div>
            <EstadoCarga loading={loading} error={error} />
            {data && (
                <>
                    <SummaryCards items={[
                        { label: 'Eventos registrados', value: data.resumen.eventos, tone: 'primary' },
                        { label: 'Ventas anuladas', value: data.resumen.ventasAnuladas, tone: data.resumen.ventasAnuladas > 0 ? 'danger' : 'default' },
                        { label: 'Monto anulado', value: money(data.resumen.montoAnulado), tone: 'danger' },
                        { label: 'Sin usuario registrado', value: data.resumen.sinUsuario, tone: data.resumen.sinUsuario > 0 ? 'warning' : 'default' },
                    ]} />
                    {data.resumen.sinUsuario > 0 && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '-0.5rem 0 1rem' }}>
                            El usuario se registra desde que el sistema empezó a informarlo a la base de datos; los cambios anteriores a esa fecha no tienen autor.
                        </p>
                    )}
                    <Seccion titulo="Ventas anuladas por usuario"><TablaReporte columnas={columnasAnuladasUsuario} filas={data.ventasAnuladasPorUsuario} vacio="No hay ventas anuladas en el rango." /></Seccion>
                    <Seccion titulo="Detalle de ventas anuladas"><TablaReporte columnas={columnasAnuladas} filas={data.ventasAnuladas} vacio="No hay ventas anuladas en el rango." /></Seccion>
                    <Seccion titulo="Actividad por usuario"><TablaReporte columnas={columnasUsuario} filas={data.porUsuario} /></Seccion>
                    <Seccion titulo={`Eventos (${data.resumen.mostrados} de ${data.resumen.eventos})`}><TablaReporte columnas={columnasEvento} filas={data.eventos} /></Seccion>
                </>
            )}
        </div>
    );
};
