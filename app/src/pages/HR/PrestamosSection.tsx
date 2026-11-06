import { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api/axios';
import { CrudSection } from './CrudSection';
import type { CrudConfig, CrudContext } from './CrudSection';
import type { Lookups } from './useLookups';
import { syncPrestamo } from './payrollApi';
import { apiError, empleadoNombre, fmtDate, money, optsFrom, periodoLabel, todayISO } from './utils';
import type { Row } from './utils';
import { IconWallet, IconCoins, IconList, IconCheck, IconRefresh } from './icons';
import { EstadoBadge, ActionButton, FormModal, DataTable, Td } from './ui';

const empleadoOpts = (lk: Lookups) => lk.empleados.filter(e => e.estado !== false).map(e => ({ value: e.id, label: empleadoNombre(e) }));
const nombreDe = (r: Row, lk: Lookups) => r.empleadonombre || empleadoNombre(lk.empleados.find(e => e.id === r.empleadoid));

// ─── Anticipos de salario ───────────────────────────────────────────────
const anticiposConfig: CrudConfig = {
    endpoint: '/anticipos-salario',
    singular: 'Anticipo',
    newLabel: 'Nuevo Anticipo',
    icon: <IconWallet />,
    modalWidth: '520px',
    searchPlaceholder: 'Buscar por empleado...',
    deleteTitle: '¿Eliminar anticipo?',
    canEdit: (r) => r.estado === 'PENDIENTE',
    canDelete: (r) => r.estado === 'PENDIENTE',
    searchText: (r, lk) => nombreDe(r, lk),
    filters: [
        { key: 'empleadoid', label: 'Todos los empleados', options: (lk) => lk.empleados.map(e => ({ value: e.id, label: empleadoNombre(e) })) },
        { key: 'estado', label: 'Todos los estados', options: optsFrom(['PENDIENTE', 'DESCONTADO']) },
    ],
    fields: [
        { key: 'empleadoid', label: 'Empleado', type: 'select', numeric: true, required: true, options: empleadoOpts, disabledOnEdit: true, full: true },
        { key: 'monto', label: 'Monto (C$)', type: 'number', required: true, min: 0 },
        { key: 'fechaanticipoid', label: 'Fecha del anticipo', type: 'date', required: true, defaultValue: todayISO() },
    ],
    toPayload: (payload, { mode, userId }) => (mode === 'create' && userId != null ? { ...payload, usuarioid: userId } : payload),
    columns: [
        { header: 'Fecha', muted: true, render: (r) => fmtDate(r.fechaanticipoid) },
        { header: 'Empleado', strong: true, render: (r, lk) => nombreDe(r, lk) },
        { header: 'Monto', align: 'right', render: (r) => <span className="tabular" style={{ fontWeight: 600 }}>{money(r.monto)}</span> },
        { header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
        {
            header: 'Descontado en', muted: true,
            render: (r, lk) => r.descontadoenperiodoid ? periodoLabel(lk.periodos.find(p => p.id === r.descontadoenperiodoid)) : '—',
        },
    ],
    summary: (rows) => [
        { label: 'Anticipos pendientes', value: rows.filter(r => r.estado === 'PENDIENTE').length, tone: 'primary' },
        { label: 'Monto pendiente de descuento', value: money(rows.filter(r => r.estado === 'PENDIENTE').reduce((s, r) => s + Number(r.monto || 0), 0)), tone: 'danger' },
        { label: 'Monto ya descontado', value: money(rows.filter(r => r.estado === 'DESCONTADO').reduce((s, r) => s + Number(r.monto || 0), 0)), tone: 'success' },
    ],
};

// ─── Cuotas de un préstamo ──────────────────────────────────────────────
const cuotaVencida = (c: Row) => c.estado === 'PENDIENTE' && c.fechavencimiento && String(c.fechavencimiento).slice(0, 10) < todayISO();

const CuotasModal = ({ prestamo, onClose }: { prestamo: Row; onClose: () => void }) => {
    const cuotas: Row[] = prestamo.cuotas || [];
    return (
        <FormModal show title={`Cuotas del préstamo #${prestamo.id}`} icon={<IconList />} maxWidth="640px" onClose={onClose} hideSubmit>
            <DataTable
                columns={[{ header: '#', align: 'center' }, { header: 'Vencimiento' }, { header: 'Monto', align: 'right' }, { header: 'Estado' }, { header: 'Pagada el' }]}
                isEmpty={cuotas.length === 0}
                emptyText="Este préstamo no tiene cuotas programadas."
            >
                {cuotas.map(c => (
                    <tr key={c.cuotaid ?? c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <Td align="center" muted>{c.numerocuota}</Td>
                        <Td>{fmtDate(c.fechavencimiento)}</Td>
                        <Td align="right" strong><span className="tabular">{money(c.montocuota)}</span></Td>
                        <Td><EstadoBadge estado={cuotaVencida(c) ? 'VENCIDA' : c.estado} /></Td>
                        <Td muted>{fmtDate(c.fechapago)}</Td>
                    </tr>
                ))}
            </DataTable>
        </FormModal>
    );
};

const PrestamoCuotasAction = ({ row }: { row: Row; ctx: CrudContext }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <ActionButton onClick={() => setOpen(true)} title="Ver calendario de cuotas">
                <IconList />
                <span>Cuotas</span>
            </ActionButton>
            {open && <CuotasModal prestamo={row} onClose={() => setOpen(false)} />}
        </>
    );
};

const prestamosConfig: CrudConfig = {
    endpoint: '/prestamos-empleados',
    singular: 'Préstamo',
    newLabel: 'Nuevo Préstamo',
    icon: <IconCoins />,
    modalWidth: '560px',
    searchPlaceholder: 'Buscar por empleado o motivo...',
    deleteTitle: '¿Eliminar préstamo?',
    deleteText: 'Solo puede eliminarse un préstamo sin cuotas descontadas en planilla.',
    canDelete: (r) => Number(r.montopagado || 0) === 0,
    searchText: (r, lk) => `${nombreDe(r, lk)} ${r.motivo || ''}`,
    filters: [
        { key: 'empleadoid', label: 'Todos los empleados', options: (lk) => lk.empleados.map(e => ({ value: e.id, label: empleadoNombre(e) })) },
        { key: 'estado', label: 'Todos los estados', options: optsFrom(['ACTIVO', 'PAGADO', 'CANCELADO']) },
    ],
    fields: [
        { key: 'empleadoid', label: 'Empleado', type: 'select', numeric: true, required: true, options: empleadoOpts, hideOnEdit: true, full: true },
        { key: 'monto', label: 'Monto del préstamo (C$)', type: 'number', required: true, min: 0, hideOnEdit: true },
        { key: 'numerocuotas', label: 'Número de cuotas (mensuales)', type: 'number', required: true, min: 1, step: '1', hideOnEdit: true, defaultValue: '6' },
        { key: 'fechadesembolso', label: 'Fecha de desembolso', type: 'date', required: true, defaultValue: todayISO(), hideOnEdit: true },
        { key: 'estado', label: 'Estado', type: 'select', required: true, options: optsFrom(['ACTIVO', 'PAGADO', 'CANCELADO']), hideOnCreate: true },
        { key: 'motivo', label: 'Motivo', type: 'textarea', full: true },
    ],
    toPayload: (payload, { mode, userId }) => (mode === 'create' && userId != null ? { ...payload, usuarioid: userId } : payload),
    columns: [
        { header: 'Desembolso', muted: true, render: (r) => fmtDate(r.fechadesembolso) },
        { header: 'Empleado', strong: true, render: (r, lk) => nombreDe(r, lk) },
        { header: 'Monto', align: 'right', render: (r) => <span className="tabular">{money(r.monto)}</span> },
        { header: 'Cuota', align: 'right', render: (r) => <span className="tabular">{r.numerocuotas} x {money(r.montocuota)}</span> },
        { header: 'Pagado', align: 'right', render: (r) => <span className="tabular" style={{ color: 'var(--accent-success)', fontWeight: 600 }}>{money(r.montopagado)}</span> },
        { header: 'Saldo', align: 'right', render: (r) => <span className="tabular" style={{ fontWeight: 600 }}>{money(r.montorestante)}</span> },
        { header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
    ],
    rowActions: (row, ctx) => <PrestamoCuotasAction row={row} ctx={ctx} />,
    summary: (rows) => {
        const activos = rows.filter(r => r.estado === 'ACTIVO');
        return [
            { label: 'Préstamos activos', value: activos.length, tone: 'primary' },
            { label: 'Saldo por cobrar', value: money(activos.reduce((s, r) => s + Number(r.montorestante || 0), 0)), tone: 'danger' },
            { label: 'Total recuperado', value: money(rows.reduce((s, r) => s + Number(r.montopagado || 0), 0)), tone: 'success' },
        ];
    },
};

// ─── Cuotas (vista global) ──────────────────────────────────────────────
const CuotaActions = ({ row, ctx }: { row: Row; ctx: CrudContext }) => {
    const cambiar = async (pagada: boolean) => {
        try {
            await api.put(`/cuotas-prestamos/${row.id}`, pagada
                ? { estado: 'PAGADA', fechapago: todayISO() }
                : { estado: 'PENDIENTE', fechapago: null });
            await syncPrestamo(row.prestamoid);
            Swal.fire({ icon: 'success', title: pagada ? 'Cuota marcada como pagada' : 'Cuota reabierta', timer: 1500, showConfirmButton: false });
            await ctx.reload();
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo actualizar la cuota.'), 'error');
        }
    };

    if (row.estado === 'PAGADA') {
        if (row.detalleid) return <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Descontada en planilla</span>;
        return (
            <ActionButton onClick={() => cambiar(false)} title="Volver a dejar la cuota pendiente">
                <IconRefresh />
                <span>Reabrir</span>
            </ActionButton>
        );
    }
    return (
        <ActionButton onClick={() => cambiar(true)} tone="success" title="Registrar el pago de la cuota fuera de planilla">
            <IconCheck />
            <span>Marcar pagada</span>
        </ActionButton>
    );
};

const cuotasConfig: CrudConfig = {
    endpoint: '/cuotas-prestamos',
    singular: 'Cuota',
    newLabel: 'Nueva Cuota',
    allowCreate: false,
    canEdit: () => false,
    canDelete: () => false,
    searchPlaceholder: 'Buscar por empleado...',
    searchText: (r, lk) => nombreDe(r, lk),
    filters: [
        { key: 'estado', label: 'Todos los estados', options: optsFrom(['PENDIENTE', 'PAGADA', 'VENCIDA']) },
    ],
    fields: [],
    columns: [
        { header: 'Vencimiento', muted: true, render: (r) => fmtDate(r.fechavencimiento) },
        { header: 'Empleado', strong: true, render: (r) => r.empleadonombre || '—' },
        { header: 'Préstamo', muted: true, render: (r) => `#${r.prestamoid}` },
        { header: 'Cuota', align: 'center', render: (r) => r.numerocuota },
        { header: 'Monto', align: 'right', render: (r) => <span className="tabular" style={{ fontWeight: 600 }}>{money(r.montocuota)}</span> },
        { header: 'Estado', render: (r) => <EstadoBadge estado={cuotaVencida(r) ? 'VENCIDA' : r.estado} /> },
        { header: 'Pagada el', muted: true, render: (r) => fmtDate(r.fechapago) },
    ],
    rowActions: (row, ctx) => <CuotaActions row={row} ctx={ctx} />,
    summary: (rows) => [
        { label: 'Cuotas pendientes', value: rows.filter(r => r.estado === 'PENDIENTE').length, tone: 'primary' },
        { label: 'Cuotas vencidas', value: rows.filter(cuotaVencida).length, tone: 'danger' },
        { label: 'Monto pendiente', value: money(rows.filter(r => r.estado !== 'PAGADA').reduce((s, r) => s + Number(r.montocuota || 0), 0)) },
    ],
};

export type PrestamosView = 'anticipos' | 'prestamos' | 'cuotas';

const CONFIGS: Record<PrestamosView, CrudConfig> = {
    anticipos: anticiposConfig,
    prestamos: prestamosConfig,
    cuotas: cuotasConfig,
};

export const PrestamosSection = ({ lookups, view }: { lookups: Lookups; view: PrestamosView }) => (
    <CrudSection key={view} config={CONFIGS[view]} lookups={lookups} />
);
