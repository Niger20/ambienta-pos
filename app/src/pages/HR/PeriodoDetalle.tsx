import { useState, useEffect, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { getArrayData } from '../../utils/arrayUtils';
import type { Lookups } from './useLookups';
import { syncPrestamo } from './payrollApi';
import {
    calcularRetenciones, esFeriado, periodFactor, pickInss, pickTramos, salarioNeto, totalDeducciones, totalIngresos,
} from './payrollCalc';
import { apiError, daysBetweenInclusive, empleadoNombre, fmtDate, labelize, money, num, periodoLabel, round2, todayISO } from './utils';
import type { Row } from './utils';
import { IconArrowLeft, IconZap, IconEye, IconEdit, IconTrash, IconCheck, IconPlus, IconWallet, IconRefresh } from './icons';
import {
    SearchBox, SummaryCards, DataTable, Td, RowActions, ActionButton, DeleteButton, EstadoBadge, FormModal, FormGrid,
    SectionToolbar, PrimaryButton,
} from './ui';

const ymd = (v: unknown) => String(v ?? '').slice(0, 10);
/** Las líneas de deducción llegan crudas (deduccionplanillaid) en el listado y como entidad (id) al crearse. */
const lid = (l: Row): number => l.id ?? l.deduccionplanillaid;

interface Props {
    periodoId: number;
    lookups: Lookups;
    onBack: () => void;
}

const EDIT_FIELDS: { key: string; label: string; help?: string }[] = [
    { key: 'salariobruto', label: 'Salario del período (C$)' },
    { key: 'montohorasextra', label: 'Horas extra (C$)' },
    { key: 'comisiones', label: 'Comisiones (C$)' },
    { key: 'pagoferiados', label: 'Pago de feriados (C$)' },
    { key: 'otrosingresos', label: 'Otros ingresos (C$)' },
    { key: 'insslaboral', label: 'INSS laboral (C$)' },
    { key: 'ir', label: 'IR (C$)' },
    { key: 'otrasdeducciones', label: 'Otras deducciones (C$)', help: 'Se suma desde el detalle de abajo.' },
    { key: 'insspatronal', label: 'INSS patronal (C$)', help: 'Aporte de la empresa; no se descuenta al empleado.' },
];

export const PeriodoDetalle = ({ periodoId, lookups, onBack }: Props) => {
    const { user } = useAuth();
    const userId = user?.id != null && !Number.isNaN(Number(user.id)) ? Number(user.id) : null;

    const [periodo, setPeriodo] = useState<Row | null>(null);
    const [detalles, setDetalles] = useState<Row[]>([]);
    const [inssList, setInssList] = useState<Row[]>([]);
    const [tramosList, setTramosList] = useState<Row[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState('');

    const [editing, setEditing] = useState<Row | null>(null);
    const [form, setForm] = useState<Record<string, string>>({});
    const [observaciones, setObservaciones] = useState('');
    const [lineas, setLineas] = useState<Row[]>([]);
    const [nuevaLinea, setNuevaLinea] = useState({ concepto: '', monto: '' });
    const [recibo, setRecibo] = useState<Row | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const [per, det, inss, tr] = await Promise.all([
                api.get(`/periodos-planilla/${periodoId}`),
                api.get(`/planilla-detalle?periodoid=${periodoId}&limit=0`),
                api.get('/configuracion-inss?activo=true&limit=0'),
                api.get('/tabla-tramo-ir?activo=true&limit=0'),
            ]);
            setPeriodo(per.data);
            setDetalles(getArrayData(det.data));
            setInssList(getArrayData(inss.data));
            setTramosList(getArrayData(tr.data));
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo cargar la planilla.'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [periodoId]);

    useEffect(() => {
        load();
    }, [load]);

    const editable = periodo?.estado === 'ABIERTO' || periodo?.estado === 'EN_REVISION';
    const fin = ymd(periodo?.fechafin);
    const inss = useMemo(() => pickInss(inssList, fin), [inssList, fin]);
    const tramos = useMemo(() => pickTramos(tramosList, fin), [tramosList, fin]);

    const empleadoDe = (d: Row) => lookups.empleados.find(e => e.id === d.empleadoid);
    const nombreDe = (d: Row) => d.empleadonombre || empleadoNombre(empleadoDe(d));

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? detalles.filter(d => (d.empleadonombre || empleadoNombre(lookups.empleados.find(e => e.id === d.empleadoid))).toLowerCase().includes(q)) : detalles;
    }, [detalles, search, lookups.empleados]);

    // ─── Generación de la planilla ──────────────────────────────────────
    const generar = async () => {
        if (!periodo) return;
        if (!inss) {
            const r = await Swal.fire({
                title: 'Sin tasa de INSS vigente',
                text: 'No hay una configuración de INSS activa para este período; el INSS saldrá en cero. ¿Continuar?',
                icon: 'warning', showCancelButton: true, confirmButtonText: 'Continuar', cancelButtonText: 'Cancelar',
            });
            if (!r.isConfirmed) return;
        }

        const existentes = new Set(detalles.map(d => d.empleadoid));
        const ini = ymd(periodo.fechainicio);
        const candidatos = lookups.empleados.filter(e =>
            e.estado !== false && ymd(e.fechaingreso) <= fin && e.tipopago === periodo.tipoperiodo && !existentes.has(e.id));

        if (candidatos.length === 0) {
            Swal.fire('Sin empleados pendientes', `No hay empleados activos con pago ${labelize(periodo.tipoperiodo).toLowerCase()} sin planilla en este período.`, 'info');
            return;
        }

        const confirm = await Swal.fire({
            title: 'Generar planilla',
            text: `Se calculará la planilla de ${candidatos.length} empleado(s): salario, horas extra de asistencia, INSS, IR, anticipos y cuotas de préstamo.`,
            icon: 'question', showCancelButton: true, confirmButtonText: 'Generar', cancelButtonText: 'Cancelar',
        });
        if (!confirm.isConfirmed) return;

        setBusy(true);
        try {
            const [asistRes, antRes, preRes, ferRes] = await Promise.all([
                api.get(`/registro-asistencia?fechainicio=${ini}&fechafin=${fin}&limit=0`),
                api.get('/anticipos-salario?estado=PENDIENTE&limit=0'),
                api.get('/prestamos-empleados?estado=ACTIVO&limit=0'),
                api.get('/feriados-nacionales?limit=0'),
            ]);
            const asistencias: Row[] = getArrayData(asistRes.data);
            const anticipos: Row[] = getArrayData(antRes.data);
            const prestamos: Row[] = getArrayData(preRes.data);
            const feriados: Row[] = getArrayData(ferRes.data);

            let creados = 0;
            const fallos: string[] = [];

            for (const emp of candidatos) {
                try {
                    // Prorrateo si ingresó dentro del período
                    const ingreso = ymd(emp.fechaingreso);
                    const diasPeriodo = daysBetweenInclusive(ini, fin);
                    const prorrateo = ingreso > ini ? Math.min(1, daysBetweenInclusive(ingreso, fin) / diasPeriodo) : 1;
                    const salarioPeriodo = round2(Number(emp.salariobase) * periodFactor(periodo.tipoperiodo) * prorrateo);

                    // Horas extra registradas en asistencia
                    const horasDia = Number(emp.horasdiariasjornada || 8);
                    const tarifa = round2(Number(emp.salariobase) / 30 / horasDia);
                    const extras = asistencias
                        .filter(a => a.empleadoid === emp.id && Number(a.horasextra || 0) > 0)
                        .map(a => {
                            const fecha = ymd(a.fecha);
                            const tipohora = esFeriado(fecha, feriados) ? 'FERIADO' : emp.tipojornada === 'NOCTURNA' ? 'NOCTURNA' : 'DIURNA';
                            return { fecha, tipohora, horastrabajadas: Number(a.horasextra), tarifahora: tarifa, porcentajerecargo: 200 };
                        });
                    const montoExtras = round2(extras.reduce((s, h) => s + h.horastrabajadas * h.tarifahora * 2, 0));

                    // Anticipos y cuotas pendientes hasta el cierre del período
                    const misAnticipos = anticipos.filter(a => a.empleadoid === emp.id && ymd(a.fechaanticipoid) <= fin);
                    const montoAnticipos = round2(misAnticipos.reduce((s, a) => s + Number(a.monto || 0), 0));
                    const misCuotas: Row[] = [];
                    prestamos.filter(p => p.empleadoid === emp.id).forEach(p => {
                        (p.cuotas || []).forEach((c: Row) => {
                            if (c.estado === 'PENDIENTE' && ymd(c.fechavencimiento) <= fin) misCuotas.push({ ...c, prestamoid: p.id });
                        });
                    });
                    const montoCuotas = round2(misCuotas.reduce((s, c) => s + Number(c.montocuota || 0), 0));

                    const ret = calcularRetenciones(salarioPeriodo + montoExtras, emp, periodo.tipoperiodo, inss, tramos);

                    const created = await api.post('/planilla-detalle', {
                        periodoid: periodo.id,
                        empleadoid: emp.id,
                        salariobruto: salarioPeriodo,
                        montohorasextra: montoExtras,
                        insslaboral: ret.insslaboral,
                        insspatronal: ret.insspatronal,
                        ir: ret.ir,
                        cuotasprestamos: montoCuotas,
                        anticipos: montoAnticipos,
                        estado: 'BORRADOR',
                    });
                    const detalleid = created.data.id;

                    for (const h of extras) await api.post('/planilla-horas-extra', { detalleid, ...h });
                    for (const a of misAnticipos) {
                        await api.put(`/anticipos-salario/${a.id}`, { estado: 'DESCONTADO', descontadoenperiodoid: periodo.id });
                    }
                    const prestamosTocados = new Set<number>();
                    for (const c of misCuotas) {
                        await api.put(`/cuotas-prestamos/${c.cuotaid}`, { estado: 'PAGADA', fechapago: ymd(periodo.fechapago) || fin, detalleid });
                        prestamosTocados.add(c.prestamoid);
                    }
                    for (const pid of prestamosTocados) await syncPrestamo(pid);
                    creados++;
                } catch (err: any) {
                    fallos.push(`${emp.nombre} ${emp.apellidos}: ${apiError(err, 'error')}`);
                }
            }

            await load();
            Swal.fire({
                icon: fallos.length ? 'warning' : 'success',
                title: `${creados} planilla${creados !== 1 ? 's' : ''} generada${creados !== 1 ? 's' : ''}`,
                text: fallos.length ? fallos.join(' | ') : undefined,
                timer: fallos.length ? undefined : 2000,
                showConfirmButton: fallos.length > 0,
            });
        } finally {
            setBusy(false);
        }
    };

    // ─── Flujo de estados del período ───────────────────────────────────
    const avanzar = async (estado: string) => {
        if (!periodo) return;
        const textos: Record<string, string> = {
            EN_REVISION: 'El período pasará a revisión.',
            ABIERTO: 'El período volverá a estar abierto para modificaciones.',
            APROBADO: 'Se aprobará la planilla de todos los empleados del período.',
            PAGADO: 'Se registrará el pago de la planilla.',
            CERRADO: 'El período se cerrará y no podrá modificarse.',
        };
        const r = await Swal.fire({ title: `Cambiar a ${labelize(estado)}`, text: textos[estado], icon: 'question', showCancelButton: true, confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar' });
        if (!r.isConfirmed) return;

        setBusy(true);
        try {
            const body: Row = { estado };
            if (estado === 'APROBADO') {
                body.fechaaprobacion = new Date().toISOString();
                if (userId != null) body.usuarioaprobacionid = userId;
            }
            if (estado === 'PAGADO' && !periodo.fechapago) body.fechapago = todayISO();
            await api.put(`/periodos-planilla/${periodo.id}`, body);
            if (estado === 'APROBADO' || estado === 'PAGADO') {
                for (const d of detalles) await api.put(`/planilla-detalle/${d.id}`, { estado });
            }
            await load();
            await lookups.reload();
            Swal.fire({ icon: 'success', title: 'Período actualizado', timer: 1500, showConfirmButton: false });
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo cambiar el estado.'), 'error');
        } finally {
            setBusy(false);
        }
    };

    // ─── Edición de un detalle ──────────────────────────────────────────
    const openEdit = (d: Row) => {
        const f: Record<string, string> = {};
        EDIT_FIELDS.forEach(ef => { f[ef.key] = String(d[ef.key] ?? 0); });
        setForm(f);
        setObservaciones(d.observaciones || '');
        setLineas(d.deducciones || []);
        setNuevaLinea({ concepto: '', monto: '' });
        setEditing(d);
    };

    const recalcular = () => {
        if (!editing || !periodo) return;
        const emp = empleadoDe(editing);
        if (!emp) return;
        const base = ['salariobruto', 'montohorasextra', 'comisiones', 'pagoferiados', 'otrosingresos'].reduce((s, k) => s + Number(form[k] || 0), 0);
        const ret = calcularRetenciones(base, emp, periodo.tipoperiodo, inss, tramos);
        setForm(prev => ({ ...prev, insslaboral: String(ret.insslaboral), ir: String(ret.ir), insspatronal: String(ret.insspatronal) }));
    };

    const syncOtrasDeducciones = (items: Row[]) => {
        setForm(prev => ({ ...prev, otrasdeducciones: String(round2(items.reduce((s, l) => s + Number(l.monto || 0), 0))) }));
    };

    const agregarLinea = async () => {
        if (!editing) return;
        const monto = Number(nuevaLinea.monto);
        if (!nuevaLinea.concepto.trim() || !(monto > 0)) {
            Swal.fire('Atención', 'Indique el concepto y un monto mayor a cero.', 'warning');
            return;
        }
        try {
            const res = await api.post('/planilla-deducciones', { detalleid: editing.id, concepto: nuevaLinea.concepto.trim(), monto });
            const next = [...lineas, res.data];
            setLineas(next);
            syncOtrasDeducciones(next);
            setNuevaLinea({ concepto: '', monto: '' });
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo agregar la deducción.'), 'error');
        }
    };

    const quitarLinea = async (l: Row) => {
        try {
            await api.delete(`/planilla-deducciones/${lid(l)}`);
            const next = lineas.filter(x => lid(x) !== lid(l));
            setLineas(next);
            syncOtrasDeducciones(next);
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo quitar la deducción.'), 'error');
        }
    };

    const saveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        try {
            const body: Row = { observaciones: observaciones.trim() || null };
            EDIT_FIELDS.forEach(ef => { body[ef.key] = Number(form[ef.key] || 0); });
            await api.put(`/planilla-detalle/${editing.id}`, body);
            setEditing(null);
            await load();
            Swal.fire({ icon: 'success', title: 'Planilla actualizada', timer: 1500, showConfirmButton: false });
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo guardar.'), 'error');
        }
    };

    // ─── Eliminación de un detalle ──────────────────────────────────────
    const eliminar = async (d: Row) => {
        const r = await Swal.fire({
            title: '¿Quitar de la planilla?',
            text: `Se eliminará la planilla de ${nombreDe(d)}. Sus anticipos y cuotas de préstamo vuelven a quedar pendientes.`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Quitar', cancelButtonText: 'Cancelar',
        });
        if (!r.isConfirmed) return;
        setBusy(true);
        try {
            const full = await api.get(`/planilla-detalle/${d.id}`);
            const prestamoIds = new Set<number>((full.data.cuotasprestamos_rel || []).map((c: Row) => c.prestamoid));
            await api.delete(`/planilla-detalle/${d.id}`);
            const antRes = await api.get(`/anticipos-salario?empleadoid=${d.empleadoid}&estado=DESCONTADO&limit=0`);
            for (const a of getArrayData<Row>(antRes.data).filter(x => x.descontadoenperiodoid === periodoId)) {
                await api.put(`/anticipos-salario/${a.id}`, { estado: 'PENDIENTE', descontadoenperiodoid: null });
            }
            for (const pid of prestamoIds) await syncPrestamo(pid);
            await load();
            Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo eliminar.'), 'error');
        } finally {
            setBusy(false);
        }
    };

    // ─── Render ─────────────────────────────────────────────────────────
    if (isLoading && !periodo) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando planilla...</div>;
    }
    if (!periodo) return null;

    const sumBy = (pick: (d: Row) => number) => detalles.reduce((s, d) => s + pick(d), 0);

    const flujo = (() => {
        switch (periodo.estado) {
            case 'ABIERTO': return [{ estado: 'EN_REVISION', label: 'Enviar a revisión', tone: 'primary' as const }];
            case 'EN_REVISION': return [{ estado: 'ABIERTO', label: 'Reabrir', tone: 'default' as const }, { estado: 'APROBADO', label: 'Aprobar planilla', tone: 'success' as const }];
            case 'APROBADO': return [{ estado: 'PAGADO', label: 'Marcar como pagada', tone: 'primary' as const }];
            case 'PAGADO': return [{ estado: 'CERRADO', label: 'Cerrar período', tone: 'default' as const }];
            default: return [];
        }
    })();

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button className="btn" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                        <IconArrowLeft />
                        <span>Períodos</span>
                    </button>
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <IconWallet />
                            <span>Planilla — {periodoLabel(periodo)}</span>
                            <EstadoBadge estado={periodo.estado} />
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                            Pago: {fmtDate(periodo.fechapago)} · INSS {inss ? `${num(Number(inss.tasalaboral) * 100)} % laboral / ${num(Number(inss.tasapatronal) * 100)} % patronal` : 'sin tasa vigente'}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {flujo.map(f => (
                        <ActionButton key={f.estado} onClick={() => avanzar(f.estado)} tone={f.tone} disabled={busy || (f.estado === 'EN_REVISION' && detalles.length === 0)}>
                            <IconCheck />
                            <span>{f.label}</span>
                        </ActionButton>
                    ))}
                    {editable && (
                        <PrimaryButton onClick={generar}>
                            <IconZap />
                            <span>{busy ? 'Procesando...' : 'Generar planilla'}</span>
                        </PrimaryButton>
                    )}
                </div>
            </div>

            <SummaryCards
                items={[
                    { label: 'Empleados en planilla', value: detalles.length, tone: 'primary' },
                    { label: 'Total ingresos', value: money(sumBy(totalIngresos)) },
                    { label: 'Total deducciones', value: money(sumBy(totalDeducciones)), tone: 'danger' },
                    { label: 'Neto a pagar', value: money(sumBy(salarioNeto)), tone: 'success' },
                    { label: 'INSS patronal', value: money(sumBy(d => Number(d.insspatronal || 0))) },
                ]}
            />

            <SectionToolbar left={<SearchBox value={search} onChange={setSearch} placeholder="Buscar por empleado..." />} />

            <DataTable
                columns={[
                    { header: 'Empleado' }, { header: 'Salario', align: 'right' }, { header: 'Horas extra', align: 'right' },
                    { header: 'Otros ingresos', align: 'right' }, { header: 'INSS', align: 'right' }, { header: 'IR', align: 'right' },
                    { header: 'Otras deducciones', align: 'right' }, { header: 'Neto', align: 'right' }, { header: 'Estado' }, { header: 'Acciones', align: 'right' },
                ]}
                isEmpty={filtered.length === 0}
                emptyText={detalles.length === 0 ? 'Aún no se ha generado la planilla de este período.' : 'No hay empleados encontrados.'}
            >
                {filtered.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <Td strong>{nombreDe(d)}</Td>
                        <Td align="right"><span className="tabular">{money(d.salariobruto)}</span></Td>
                        <Td align="right"><span className="tabular">{money(d.montohorasextra)}</span></Td>
                        <Td align="right"><span className="tabular">{money(Number(d.comisiones || 0) + Number(d.pagoferiados || 0) + Number(d.otrosingresos || 0))}</span></Td>
                        <Td align="right"><span className="tabular">{money(d.insslaboral)}</span></Td>
                        <Td align="right"><span className="tabular">{money(d.ir)}</span></Td>
                        <Td align="right"><span className="tabular">{money(Number(d.otrasdeducciones || 0) + Number(d.cuotasprestamos || 0) + Number(d.anticipos || 0))}</span></Td>
                        <Td align="right"><span className="tabular" style={{ fontWeight: 700, color: 'var(--accent-success)' }}>{money(salarioNeto(d))}</span></Td>
                        <Td><EstadoBadge estado={d.estado} /></Td>
                        <Td align="right">
                            <RowActions>
                                <ActionButton onClick={() => setRecibo(d)} title="Ver desglose del pago">
                                    <IconEye />
                                    <span>Recibo</span>
                                </ActionButton>
                                {editable && (
                                    <>
                                        <ActionButton onClick={() => openEdit(d)} title="Editar montos">
                                            <IconEdit />
                                            <span>Editar</span>
                                        </ActionButton>
                                        <DeleteButton onClick={() => eliminar(d)} label="Quitar" />
                                    </>
                                )}
                            </RowActions>
                        </Td>
                    </tr>
                ))}
            </DataTable>

            {/* ── Edición ── */}
            <FormModal show={editing != null} title={`Editar planilla — ${editing ? nombreDe(editing) : ''}`} icon={<IconEdit />} maxWidth="720px" onClose={() => setEditing(null)} onSubmit={saveEdit}>
                <FormGrid>
                    {EDIT_FIELDS.map(ef => (
                        <div className="form-group" key={ef.key}>
                            <label className="form-label">{ef.label}</label>
                            <input
                                type="number" step="any" min="0" className="form-input tabular"
                                value={form[ef.key] ?? ''}
                                onChange={(e) => setForm(prev => ({ ...prev, [ef.key]: e.target.value }))}
                                disabled={ef.key === 'otrasdeducciones' && lineas.length > 0}
                            />
                            {ef.help && <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.3rem' }}>{ef.help}</div>}
                        </div>
                    ))}
                </FormGrid>

                <div style={{ marginBottom: '1rem' }}>
                    <button type="button" className="btn" onClick={recalcular} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <IconRefresh />
                        <span>Recalcular INSS e IR con los ingresos actuales</span>
                    </button>
                </div>

                <div className="form-group">
                    <label className="form-label">Detalle de otras deducciones</label>
                    {lineas.map(l => (
                        <div key={lid(l)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span>{l.concepto}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span className="tabular" style={{ fontWeight: 600 }}>{money(l.monto)}</span>
                                <button type="button" className="btn" onClick={() => quitarLinea(l)} title="Quitar" style={{ padding: '0.25rem 0.5rem', color: 'var(--accent-danger)' }}><IconTrash /></button>
                            </span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <input type="text" className="form-input" placeholder="Concepto" style={{ flex: '2 1 160px' }} value={nuevaLinea.concepto} onChange={(e) => setNuevaLinea(p => ({ ...p, concepto: e.target.value }))} />
                        <input type="number" step="any" min="0" className="form-input tabular" placeholder="Monto" style={{ flex: '1 1 100px' }} value={nuevaLinea.monto} onChange={(e) => setNuevaLinea(p => ({ ...p, monto: e.target.value }))} />
                        <button type="button" className="btn" onClick={agregarLinea} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <IconPlus />
                            <span>Agregar</span>
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Observaciones</label>
                    <textarea className="form-input" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} style={{ resize: 'vertical' }} />
                </div>
            </FormModal>

            {/* ── Recibo ── */}
            <FormModal show={recibo != null} title={`Recibo de pago — ${recibo ? nombreDe(recibo) : ''}`} icon={<IconEye />} maxWidth="560px" onClose={() => setRecibo(null)} hideSubmit>
                {recibo && <ReciboDetalle d={recibo} />}
            </FormModal>
        </>
    );
};

const Linea = ({ label, value, strong, tone }: { label: string; value: number; strong?: boolean; tone?: 'success' | 'danger' }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontWeight: strong ? 700 : 400, borderBottom: strong ? 'none' : '1px solid var(--border-color)' }}>
        <span style={{ color: strong ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
        <span className="tabular" style={{ color: tone ? `var(--accent-${tone})` : 'var(--text-primary)' }}>{money(value)}</span>
    </div>
);

const ReciboDetalle = ({ d }: { d: Row }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>INGRESOS</div>
            <Linea label="Salario del período" value={Number(d.salariobruto || 0)} />
            <Linea label="Horas extra" value={Number(d.montohorasextra || 0)} />
            {(d.horasextra || []).map((h: Row) => (
                <div key={h.horasextraid ?? h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0 0.2rem 1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span>{fmtDate(h.fecha)} · {labelize(h.tipohora)} · {num(h.horastrabajadas)} h</span>
                    <span className="tabular">{money(h.montohoraextra)}</span>
                </div>
            ))}
            <Linea label="Comisiones" value={Number(d.comisiones || 0)} />
            <Linea label="Pago de feriados" value={Number(d.pagoferiados || 0)} />
            <Linea label="Otros ingresos" value={Number(d.otrosingresos || 0)} />
            <Linea label="Total ingresos" value={totalIngresos(d)} strong />
        </div>
        <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>DEDUCCIONES</div>
            <Linea label="INSS laboral" value={Number(d.insslaboral || 0)} />
            <Linea label="IR" value={Number(d.ir || 0)} />
            <Linea label="Cuotas de préstamo" value={Number(d.cuotasprestamos || 0)} />
            <Linea label="Anticipos de salario" value={Number(d.anticipos || 0)} />
            <Linea label="Otras deducciones" value={Number(d.otrasdeducciones || 0)} />
            {(d.deducciones || []).map((l: Row) => (
                <div key={lid(l)} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0 0.2rem 1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span>{l.concepto}</span>
                    <span className="tabular">{money(l.monto)}</span>
                </div>
            ))}
            <Linea label="Total deducciones" value={totalDeducciones(d)} strong tone="danger" />
        </div>
        <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-success-border)', backgroundColor: 'var(--accent-success-bg-light)' }}>
            <Linea label="Neto a pagar" value={salarioNeto(d)} strong tone="success" />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Aporte patronal INSS (a cargo de la empresa): {money(d.insspatronal)}
            </div>
        </div>
    </div>
);
