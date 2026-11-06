import Swal from 'sweetalert2';
import api from '../../api/axios';
import { CrudSection } from './CrudSection';
import type { CrudConfig, CrudContext } from './CrudSection';
import type { Lookups } from './useLookups';
import { GenerarAcumulados } from './GenerarAcumulados';
import { apiError, businessDays, empleadoNombre, fmtDate, money, num, optsFrom, periodoLabel, round2, todayISO } from './utils';
import type { Row } from './utils';
import { IconSun, IconCalendar, IconCheck, IconX } from './icons';
import { EstadoBadge, ActionButton } from './ui';

const empleadoOpts = (lk: Lookups) => lk.empleados.filter(e => e.estado !== false).map(e => ({ value: e.id, label: empleadoNombre(e) }));
const nombreDe = (r: Row, lk: Lookups) => r.empleadonombre || empleadoNombre(lk.empleados.find(e => e.id === r.empleadoid));

// ─── Solicitudes de vacaciones ──────────────────────────────────────────
const SolicitudActions = ({ row, ctx }: { row: Row; ctx: CrudContext }) => {
    const cambiarEstado = async (estado: string, titulo: string, aprobacion: boolean) => {
        const result = await Swal.fire({
            title: titulo,
            text: `Solicitud de ${nombreDe(row, ctx.lookups)} (${fmtDate(row.fechainicio)} al ${fmtDate(row.fechafin)}).`,
            icon: estado === 'RECHAZADA' || estado === 'CANCELADA' ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Volver',
        });
        if (!result.isConfirmed) return;
        try {
            const body: Row = { estado };
            if (aprobacion) {
                body.fechaaprobacion = new Date().toISOString();
                if (ctx.userId != null) body.usuarioaprobacionid = ctx.userId;
            }
            await api.put(`/solicitudes-vacaciones/${row.id}`, body);
            Swal.fire({ icon: 'success', title: 'Solicitud actualizada', timer: 1500, showConfirmButton: false });
            await ctx.reload();
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo actualizar la solicitud.'), 'error');
        }
    };

    if (row.estado === 'PENDIENTE') {
        return (
            <>
                <ActionButton onClick={() => cambiarEstado('APROBADA', 'Aprobar solicitud', true)} tone="success" title="Aprobar">
                    <IconCheck />
                    <span>Aprobar</span>
                </ActionButton>
                <ActionButton onClick={() => cambiarEstado('RECHAZADA', 'Rechazar solicitud', true)} tone="danger" title="Rechazar">
                    <IconX />
                    <span>Rechazar</span>
                </ActionButton>
            </>
        );
    }
    if (row.estado === 'APROBADA') {
        return (
            <>
                <ActionButton onClick={() => cambiarEstado('DISFRUTADA', 'Marcar como disfrutada', false)} tone="primary" title="Las vacaciones ya se tomaron">
                    <IconCheck />
                    <span>Disfrutada</span>
                </ActionButton>
                <ActionButton onClick={() => cambiarEstado('CANCELADA', 'Cancelar solicitud', false)} tone="danger" title="Cancelar">
                    <IconX />
                    <span>Cancelar</span>
                </ActionButton>
            </>
        );
    }
    return null;
};

const solicitudesConfig: CrudConfig = {
    endpoint: '/solicitudes-vacaciones',
    singular: 'Solicitud',
    newLabel: 'Nueva Solicitud',
    icon: <IconCalendar />,
    modalWidth: '560px',
    searchPlaceholder: 'Buscar por empleado...',
    deleteTitle: '¿Eliminar solicitud?',
    canEdit: (r) => r.estado === 'PENDIENTE',
    canDelete: (r) => r.estado !== 'APROBADA' && r.estado !== 'DISFRUTADA',
    searchText: (r, lk) => nombreDe(r, lk),
    filters: [
        { key: 'empleadoid', label: 'Todos los empleados', options: (lk) => lk.empleados.map(e => ({ value: e.id, label: empleadoNombre(e) })) },
        { key: 'estado', label: 'Todos los estados', options: optsFrom(['PENDIENTE', 'APROBADA', 'RECHAZADA', 'DISFRUTADA', 'CANCELADA']) },
    ],
    fields: [
        { key: 'empleadoid', label: 'Empleado', type: 'select', numeric: true, required: true, options: empleadoOpts, disabledOnEdit: true, full: true },
        { key: 'fechainicio', label: 'Desde', type: 'date', required: true, defaultValue: todayISO() },
        { key: 'fechafin', label: 'Hasta', type: 'date', required: true, defaultValue: todayISO() },
        { key: 'diashabiles', label: 'Días hábiles', type: 'number', min: 0, step: '0.5', help: 'Si se deja vacío se cuentan de lunes a sábado.' },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea', full: true },
    ],
    toPayload: (payload, { form }) => {
        const out = { ...payload };
        if (out.diashabiles == null) out.diashabiles = businessDays(String(form.fechainicio), String(form.fechafin));
        return out;
    },
    columns: [
        { header: 'Empleado', strong: true, render: (r, lk) => nombreDe(r, lk) },
        { header: 'Desde', muted: true, render: (r) => fmtDate(r.fechainicio) },
        { header: 'Hasta', muted: true, render: (r) => fmtDate(r.fechafin) },
        { header: 'Días hábiles', align: 'right', render: (r) => <span className="tabular">{num(r.diashabiles, 1)}</span> },
        { header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
        { header: 'Observaciones', muted: true, render: (r) => r.observaciones || '—' },
    ],
    rowActions: (row, ctx) => <SolicitudActions row={row} ctx={ctx} />,
    summary: (rows) => [
        { label: 'Pendientes de resolver', value: rows.filter(r => r.estado === 'PENDIENTE').length, tone: 'primary' },
        { label: 'Aprobadas', value: rows.filter(r => r.estado === 'APROBADA').length, tone: 'success' },
        { label: 'Días aprobados', value: num(rows.filter(r => r.estado === 'APROBADA' || r.estado === 'DISFRUTADA').reduce((s, r) => s + Number(r.diashabiles || 0), 0), 1) },
    ],
};

// ─── Acumulado de vacaciones ────────────────────────────────────────────
const acumuladoVacacionesConfig: CrudConfig = {
    endpoint: '/acumulado-vacaciones',
    singular: 'Acumulado de vacaciones',
    newLabel: 'Nuevo Acumulado',
    icon: <IconSun />,
    modalWidth: '600px',
    searchPlaceholder: 'Buscar por empleado...',
    searchText: (r, lk) => nombreDe(r, lk),
    filters: [
        { key: 'empleadoid', label: 'Todos los empleados', options: (lk) => lk.empleados.map(e => ({ value: e.id, label: empleadoNombre(e) })) },
        { key: 'periodoid', label: 'Todos los períodos', options: (lk) => lk.periodos.map(p => ({ value: p.id, label: periodoLabel(p) })) },
    ],
    fields: [
        { key: 'empleadoid', label: 'Empleado', type: 'select', numeric: true, required: true, options: empleadoOpts, disabledOnEdit: true },
        { key: 'periodoid', label: 'Período', type: 'select', numeric: true, required: true, options: (lk) => lk.periodos.map(p => ({ value: p.id, label: periodoLabel(p) })), disabledOnEdit: true },
        { key: 'diasganados', label: 'Días ganados', type: 'number', min: 0, step: '0.01', defaultValue: '2.5' },
        { key: 'valordiasalario', label: 'Valor del día de salario (C$)', type: 'number', min: 0, help: 'Si se deja vacío: salario base / 30.' },
        { key: 'diasdisfrutados', label: 'Días disfrutados', type: 'number', min: 0, step: '0.01', defaultValue: '0' },
        { key: 'montopagado', label: 'Monto pagado (C$)', type: 'number', min: 0, defaultValue: '0' },
        { key: 'fechageneracion', label: 'Fecha de generación', type: 'date', defaultValue: todayISO() },
    ],
    toPayload: (payload, { mode, lookups }) => {
        const out = { ...payload };
        if (mode === 'edit') { delete out.empleadoid; delete out.periodoid; return out; }
        if (out.valordiasalario == null) {
            const emp = lookups.empleados.find(e => e.id === out.empleadoid);
            out.valordiasalario = round2(Number(emp?.salariobase || 0) / 30);
        }
        return out;
    },
    columns: [
        { header: 'Período', muted: true, render: (r, lk) => periodoLabel(lk.periodos.find(p => p.id === r.periodoid)) },
        { header: 'Empleado', strong: true, render: (r, lk) => nombreDe(r, lk) },
        { header: 'Días ganados', align: 'right', render: (r) => <span className="tabular">{num(r.diasganados)}</span> },
        { header: 'Valor día', align: 'right', render: (r) => <span className="tabular">{money(r.valordiasalario)}</span> },
        { header: 'Monto ganado', align: 'right', render: (r) => <span className="tabular" style={{ fontWeight: 600 }}>{money(r.montoganado ?? Number(r.diasganados) * Number(r.valordiasalario))}</span> },
        { header: 'Disfrutados', align: 'right', render: (r) => <span className="tabular">{num(r.diasdisfrutados)}</span> },
        { header: 'Pagado', align: 'right', render: (r) => <span className="tabular" style={{ color: 'var(--accent-success)' }}>{money(r.montopagado)}</span> },
    ],
    toolbarExtra: (ctx) => (
        <GenerarAcumulados
            endpoint="/acumulado-vacaciones"
            title="Generar acumulado de vacaciones"
            ctx={ctx}
            buildPayload={(emp) => ({ diasganados: 2.5, valordiasalario: round2(Number(emp.salariobase) / 30) })}
        />
    ),
    summary: (rows) => {
        const ganados = rows.reduce((s, r) => s + Number(r.diasganados || 0), 0);
        const disfrutados = rows.reduce((s, r) => s + Number(r.diasdisfrutados || 0), 0);
        return [
            { label: 'Días ganados', value: num(ganados), tone: 'primary' },
            { label: 'Días disfrutados', value: num(disfrutados) },
            { label: 'Saldo de días', value: num(ganados - disfrutados), tone: 'success' },
        ];
    },
};

export type VacacionesView = 'solicitudes' | 'acumulado';

const CONFIGS: Record<VacacionesView, CrudConfig> = {
    solicitudes: solicitudesConfig,
    acumulado: acumuladoVacacionesConfig,
};

export const VacacionesSection = ({ lookups, view }: { lookups: Lookups; view: VacacionesView }) => (
    <CrudSection key={view} config={CONFIGS[view]} lookups={lookups} />
);
