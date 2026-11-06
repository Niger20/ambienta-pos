import { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api/axios';
import { getArrayData } from '../../utils/arrayUtils';
import { CrudSection } from './CrudSection';
import type { CrudConfig, CrudContext } from './CrudSection';
import type { Lookups } from './useLookups';
import { apiError, empleadoNombre, fmtDate, money, optsFrom, todayISO } from './utils';
import type { Row } from './utils';
import { IconUsers, IconTrend, IconList, IconRefresh } from './icons';
import { ActionButton, FormModal, FormGrid, DataTable, Td } from './ui';

// ─── Cambio de salario + historial (por empleado) ───────────────────────
const SalarioActions = ({ row, ctx }: { row: Row; ctx: CrudContext }) => {
    const [showSalario, setShowSalario] = useState(false);
    const [showHistorial, setShowHistorial] = useState(false);
    const [nuevoSalario, setNuevoSalario] = useState('');
    const [motivo, setMotivo] = useState('');
    const [fecha, setFecha] = useState(todayISO());
    const [historial, setHistorial] = useState<Row[]>([]);
    const [loadingHist, setLoadingHist] = useState(false);

    const openSalario = () => {
        setNuevoSalario(String(row.salariobase ?? ''));
        setMotivo('');
        setFecha(todayISO());
        setShowSalario(true);
    };

    const openHistorial = async () => {
        setShowHistorial(true);
        setLoadingHist(true);
        try {
            const res = await api.get(`/historial-salarios?empleadoid=${row.id}&limit=0`);
            setHistorial(getArrayData(res.data));
        } catch {
            setHistorial([]);
        } finally {
            setLoadingHist(false);
        }
    };

    const saveSalario = async (e: React.FormEvent) => {
        e.preventDefault();
        const nuevo = Number(nuevoSalario);
        if (!(nuevo >= 0) || nuevo === Number(row.salariobase)) {
            Swal.fire('Atención', 'Ingrese un salario distinto al actual.', 'warning');
            return;
        }
        try {
            await api.post('/historial-salarios', {
                empleadoid: row.id,
                salarioanterior: Number(row.salariobase),
                salarionuevo: nuevo,
                motivo: motivo.trim() || 'Ajuste salarial',
                fechacambio: fecha,
            });
            Swal.fire({ icon: 'success', title: 'Salario actualizado', timer: 1500, showConfirmButton: false });
            setShowSalario(false);
            await ctx.reload();
            await ctx.reloadLookups();
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo cambiar el salario.'), 'error');
        }
    };

    if (ctx.isInactive) return null;

    return (
        <>
            <ActionButton onClick={openSalario} tone="primary" title="Cambiar salario base">
                <IconTrend />
                <span>Salario</span>
            </ActionButton>
            <ActionButton onClick={openHistorial} title="Ver historial de salarios">
                <IconList />
                <span>Historial</span>
            </ActionButton>

            <FormModal show={showSalario} title={`Cambiar salario — ${empleadoNombre(row)}`} icon={<IconTrend />} maxWidth="440px" onClose={() => setShowSalario(false)} onSubmit={saveSalario} submitLabel="Aplicar cambio">
                <div className="form-group">
                    <label className="form-label">Salario actual</label>
                    <input className="form-input tabular" value={money(row.salariobase)} disabled />
                </div>
                <FormGrid>
                    <div className="form-group">
                        <label className="form-label">Nuevo salario (C$) *</label>
                        <input type="number" step="any" min="0" className="form-input tabular" value={nuevoSalario} onChange={(e) => setNuevoSalario(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Fecha del cambio *</label>
                        <input type="date" className="form-input" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                    </div>
                </FormGrid>
                <div className="form-group">
                    <label className="form-label">Motivo</label>
                    <input type="text" className="form-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Aumento por desempeño" />
                </div>
            </FormModal>

            <FormModal show={showHistorial} title={`Historial de salarios — ${empleadoNombre(row)}`} icon={<IconList />} maxWidth="640px" onClose={() => setShowHistorial(false)} hideSubmit>
                {loadingHist ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando historial...</div>
                ) : (
                    <DataTable
                        columns={[{ header: 'Fecha' }, { header: 'Anterior', align: 'right' }, { header: 'Nuevo', align: 'right' }, { header: 'Motivo' }]}
                        isEmpty={historial.length === 0}
                        emptyText="Sin cambios de salario registrados."
                    >
                        {historial.map(h => (
                            <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <Td muted>{fmtDate(h.fechacambio)}</Td>
                                <Td align="right"><span className="tabular">{money(h.salarioanterior)}</span></Td>
                                <Td align="right" strong><span className="tabular">{money(h.salarionuevo)}</span></Td>
                                <Td muted>{h.motivo || '—'}</Td>
                            </tr>
                        ))}
                    </DataTable>
                )}
            </FormModal>
        </>
    );
};

// ─── Reactivar empleado dado de baja ────────────────────────────────────
const ReactivarAction = ({ row, ctx }: { row: Row; ctx: CrudContext }) => {
    if (!ctx.isInactive) return null;
    const reactivar = async () => {
        const result = await Swal.fire({
            title: '¿Reactivar empleado?',
            text: `${empleadoNombre(row)} volverá a figurar como activo.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Reactivar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await api.put(`/empleados/${row.id}`, { estado: true, fechasalida: null, motivosalida: null });
            Swal.fire({ icon: 'success', title: 'Empleado reactivado', timer: 1500, showConfirmButton: false });
            await ctx.reload();
            await ctx.reloadLookups();
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo reactivar.'), 'error');
        }
    };
    return (
        <ActionButton onClick={reactivar} tone="success" title="Reactivar empleado">
            <IconRefresh />
            <span>Reactivar</span>
        </ActionButton>
    );
};

const empleadosConfig: CrudConfig = {
    endpoint: '/empleados',
    deactivatedEndpoint: '/empleados/deactivated',
    singular: 'Empleado',
    newLabel: 'Nuevo Empleado',
    icon: <IconUsers />,
    modalWidth: '720px',
    searchPlaceholder: 'Buscar por nombre, cédula o cargo...',
    deleteTitle: '¿Dar de baja al empleado?',
    deleteText: 'Se desactivará y se registrará la fecha de salida. Para pagar sus prestaciones use la pestaña Liquidaciones.',
    deleteLabel: 'Dar de baja',
    searchText: (r) => `${r.nombre} ${r.apellidos} ${r.cedula} ${r.cargonombre || r.cargo || ''} ${r.departamentonombre || ''}`,
    fields: [
        { key: 'nombre', label: 'Nombres', required: true },
        { key: 'apellidos', label: 'Apellidos', required: true },
        { key: 'cedula', label: 'Cédula', required: true, placeholder: '001-010190-0001A' },
        { key: 'sexo', label: 'Sexo', type: 'select', options: [{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }] },
        { key: 'fechanacimiento', label: 'Fecha de nacimiento', type: 'date' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'email', label: 'Correo electrónico', type: 'email' },
        { key: 'direcciondomicilio', label: 'Dirección de domicilio', full: true },
        { key: 'departamentoid', label: 'Departamento', type: 'select', numeric: true, options: (lk) => lk.departamentos.map(d => ({ value: d.id, label: d.nombre })) },
        { key: 'cargoid', label: 'Cargo', type: 'select', numeric: true, options: (lk) => lk.cargos.filter(c => c.estado !== false).map(c => ({ value: c.id, label: c.nombre })) },
        { key: 'fechaingreso', label: 'Fecha de ingreso', type: 'date', required: true, defaultValue: todayISO() },
        { key: 'salariobase', label: 'Salario base (C$)', type: 'number', required: true, min: 0, disabledOnEdit: true, help: 'Para modificarlo use el botón Salario (queda en el historial).' },
        { key: 'tipocontrato', label: 'Tipo de contrato', type: 'select', required: true, defaultValue: 'PLANILLA', options: optsFrom(['PLANILLA', 'SERVICIOS_PROFESIONALES']) },
        { key: 'tipopago', label: 'Frecuencia de pago', type: 'select', required: true, defaultValue: 'MENSUAL', options: optsFrom(['MENSUAL', 'QUINCENAL', 'SEMANAL']) },
        { key: 'tipojornada', label: 'Jornada', type: 'select', required: true, defaultValue: 'DIURNA', options: optsFrom(['DIURNA', 'NOCTURNA', 'MIXTA']) },
        { key: 'horasdiariasjornada', label: 'Horas diarias', type: 'number', min: 1, max: 24, step: '0.5', defaultValue: '8' },
        { key: 'numeroinss', label: 'Número de INSS' },
        { key: 'banco', label: 'Banco' },
        { key: 'cuentabancaria', label: 'Cuenta bancaria' },
        { key: 'tipocuenta', label: 'Tipo de cuenta', type: 'select', options: optsFrom(['CORRIENTE', 'AHORROS']) },
    ],
    columns: [
        { header: 'Empleado', strong: true, render: (r) => `${r.nombre} ${r.apellidos}` },
        { header: 'Cédula', muted: true, render: (r) => <span className="tabular">{r.cedula}</span> },
        { header: 'Cargo', render: (r) => r.cargonombre || r.cargo || '—' },
        { header: 'Departamento', muted: true, render: (r) => r.departamentonombre || '—' },
        { header: 'Salario base', align: 'right', render: (r) => <span className="tabular" style={{ fontWeight: 600 }}>{money(r.salariobase)}</span> },
        { header: 'Ingreso', muted: true, render: (r) => fmtDate(r.fechaingreso) },
    ],
    summary: (rows) => [
        { label: 'Empleados en la vista', value: rows.length, tone: 'primary' },
        { label: 'Salario base total', value: money(rows.reduce((s, r) => s + Number(r.salariobase || 0), 0)), tone: 'success' },
        { label: 'Salario base promedio', value: money(rows.length ? rows.reduce((s, r) => s + Number(r.salariobase || 0), 0) / rows.length : 0) },
    ],
    rowActions: (row, ctx) => (
        <>
            <SalarioActions row={row} ctx={ctx} />
            <ReactivarAction row={row} ctx={ctx} />
        </>
    ),
};

export const EmpleadosSection = ({ lookups }: { lookups: Lookups }) => {
    // El campo textual `cargo` del empleado se deriva del cargo elegido en el catálogo.
    const config: CrudConfig = {
        ...empleadosConfig,
        toPayload: (payload, ctx) => {
            const out = { ...payload };
            if (ctx.mode === 'edit') delete out.salariobase;
            const found = lookups.cargos.find(c => String(c.id) === String(ctx.form.cargoid));
            out.cargo = found?.nombre || ctx.row?.cargo || 'General';
            return out;
        },
    };
    return <CrudSection config={config} lookups={lookups} />;
};
