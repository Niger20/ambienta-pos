import Swal from 'sweetalert2';
import api from '../../api/axios';
import { getArrayData } from '../../utils/arrayUtils';
import { CrudSection } from './CrudSection';
import type { CrudConfig, CrudContext } from './CrudSection';
import type { Lookups } from './useLookups';
import { apiError, daysBetweenInclusive, empleadoNombre, fmtDate, labelize, money, optsFrom, round2, todayISO } from './utils';
import type { Row } from './utils';
import { IconLogOut, IconCheck } from './icons';
import { EstadoBadge, ActionButton, Badge } from './ui';

const TIPOS_SALIDA = ['RENUNCIA', 'DESPIDO_JUSTIFICADO', 'DESPIDO_INJUSTIFICADO', 'MUTUO_ACUERDO', 'FALLECIMIENTO'];

const sum = (rows: Row[], pick: (r: Row) => number) => rows.reduce((s, r) => s + pick(r), 0);

const nombreDe = (r: Row, lk: Lookups) => r.empleadonombre || empleadoNombre(lk.empleados.find(e => e.id === r.empleadoid));

/** Calcula los montos que el usuario dejó vacíos a partir de los acumulados y deudas del empleado. */
async function autocompletar(out: Row, emp: Row | undefined): Promise<Row> {
    if (!emp) return out;
    const id = emp.id;
    const [vac, dec, ind, pre, ant] = await Promise.all([
        api.get(`/acumulado-vacaciones?empleadoid=${id}&limit=0`),
        api.get(`/acumulado-decimo-primer-mes?empleadoid=${id}&limit=0`),
        api.get(`/acumulado-indemnizacion?empleadoid=${id}&limit=0`),
        api.get(`/prestamos-empleados?empleadoid=${id}&estado=ACTIVO&limit=0`),
        api.get(`/anticipos-salario?empleadoid=${id}&estado=PENDIENTE&limit=0`),
    ]);
    const salario = Number(emp.salariobase || 0);

    if (out.salariobrutobase == null) out.salariobrutobase = salario;
    if (out.diaslaborados == null) out.diaslaborados = Math.max(0, daysBetweenInclusive(String(emp.fechaingreso).slice(0, 10), String(out.fechaliquidacion)));

    if (out.vacacionespagadas == null) {
        const vacRows = getArrayData<Row>(vac.data);
        const saldoDias = sum(vacRows, r => Number(r.diasganados || 0)) - sum(vacRows, r => Number(r.diasdisfrutados || 0));
        out.vacacionespagadas = round2(Math.max(0, saldoDias) * (salario / 30));
    }
    if (out.decimotercerpagado == null) {
        const decRows = getArrayData<Row>(dec.data);
        out.decimotercerpagado = round2(Math.max(0, sum(decRows, r => Number(r.montoacumulado || 0)) - sum(decRows, r => Number(r.montopagado || 0))));
    }
    if (out.indemnizacionpagada == null) {
        const indRows = getArrayData<Row>(ind.data);
        // Sin derecho a indemnización en despido justificado ni fallecimiento; tope de 5 meses de salario.
        const aplica = out.tiposalida !== 'DESPIDO_JUSTIFICADO' && out.tiposalida !== 'FALLECIMIENTO';
        out.indemnizacionpagada = aplica ? round2(Math.min(sum(indRows, r => Number(r.montoacumulado || 0)), salario * 5)) : 0;
    }
    if (out.prestamosdescontados == null) {
        out.prestamosdescontados = round2(sum(getArrayData<Row>(pre.data), r => Number(r.montorestante || 0)));
    }
    if (out.anticiposdescontados == null) {
        out.anticiposdescontados = round2(sum(getArrayData<Row>(ant.data), r => Number(r.monto || 0)));
    }
    return out;
}

const LiquidacionActions = ({ row, ctx }: { row: Row; ctx: CrudContext }) => {
    const cambiar = async (estado: 'APROBADO' | 'PAGADO') => {
        const esPago = estado === 'PAGADO';
        const result = await Swal.fire({
            title: esPago ? 'Marcar liquidación como pagada' : 'Aprobar liquidación',
            text: esPago
                ? `Se registrará el pago a ${nombreDe(row, ctx.lookups)} y el empleado se dará de baja con fecha ${fmtDate(row.fechaliquidacion)}.`
                : `Se aprobará la liquidación de ${nombreDe(row, ctx.lookups)} por ${money(row.montoneto)}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Volver',
        });
        if (!result.isConfirmed) return;
        try {
            await api.put(`/liquidaciones-empleados/${row.id}`, { estado });
            if (esPago) {
                await api.put(`/empleados/${row.empleadoid}`, {
                    estado: false,
                    fechasalida: String(row.fechaliquidacion).slice(0, 10),
                    motivosalida: labelize(row.tiposalida),
                });
            }
            Swal.fire({ icon: 'success', title: esPago ? 'Liquidación pagada' : 'Liquidación aprobada', timer: 1500, showConfirmButton: false });
            await ctx.reload();
            await ctx.reloadLookups();
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo actualizar la liquidación.'), 'error');
        }
    };

    if (row.estado === 'BORRADOR') {
        return (
            <ActionButton onClick={() => cambiar('APROBADO')} tone="success" title="Aprobar liquidación">
                <IconCheck />
                <span>Aprobar</span>
            </ActionButton>
        );
    }
    if (row.estado === 'APROBADO') {
        return (
            <ActionButton onClick={() => cambiar('PAGADO')} tone="primary" title="Registrar pago y dar de baja al empleado">
                <IconCheck />
                <span>Marcar pagada</span>
            </ActionButton>
        );
    }
    return null;
};

export const LiquidacionesSection = ({ lookups }: { lookups: Lookups }) => {
    const config: CrudConfig = {
        endpoint: '/liquidaciones-empleados',
        singular: 'Liquidación',
        newLabel: 'Nueva Liquidación',
        icon: <IconLogOut />,
        modalWidth: '720px',
        searchPlaceholder: 'Buscar por empleado...',
        deleteTitle: '¿Eliminar liquidación?',
        deleteText: 'Solo se pueden eliminar liquidaciones en borrador.',
        canEdit: (r) => r.estado === 'BORRADOR',
        canDelete: (r) => r.estado === 'BORRADOR',
        searchText: (r, lk) => nombreDe(r, lk),
        filters: [
            { key: 'empleadoid', label: 'Todos los empleados', options: (lk) => lk.empleados.map(e => ({ value: e.id, label: empleadoNombre(e) })) },
            { key: 'estado', label: 'Todos los estados', options: optsFrom(['BORRADOR', 'APROBADO', 'PAGADO']) },
        ],
        fields: [
            { key: 'empleadoid', label: 'Empleado', type: 'select', numeric: true, required: true, disabledOnEdit: true, options: (lk) => lk.empleados.filter(e => e.estado !== false).map(e => ({ value: e.id, label: empleadoNombre(e) })) },
            { key: 'fechaliquidacion', label: 'Fecha de liquidación', type: 'date', required: true, defaultValue: todayISO() },
            { key: 'tiposalida', label: 'Tipo de salida', type: 'select', required: true, defaultValue: 'RENUNCIA', options: optsFrom(TIPOS_SALIDA), full: true },
            { key: 'salariobrutobase', label: 'Salario bruto base (C$)', type: 'number', min: 0, help: 'Vacío: salario base del empleado.' },
            { key: 'diaslaborados', label: 'Días laborados', type: 'number', min: 0, step: '1', help: 'Vacío: desde la fecha de ingreso.' },
            { key: 'vacacionespagadas', label: 'Vacaciones pendientes (C$)', type: 'number', min: 0, help: 'Vacío: saldo de días acumulados.' },
            { key: 'decimotercerpagado', label: 'Décimo tercer mes (C$)', type: 'number', min: 0, help: 'Vacío: saldo acumulado sin pagar.' },
            { key: 'indemnizacionpagada', label: 'Indemnización (C$)', type: 'number', min: 0, help: 'Vacío: acumulado, según tipo de salida.' },
            { key: 'salariosatrasados', label: 'Salarios atrasados (C$)', type: 'number', min: 0, defaultValue: '0' },
            { key: 'otrosbeneficios', label: 'Otros beneficios (C$)', type: 'number', min: 0, defaultValue: '0' },
            { key: 'prestamosdescontados', label: 'Préstamos a descontar (C$)', type: 'number', min: 0, help: 'Vacío: saldo de préstamos activos.' },
            { key: 'anticiposdescontados', label: 'Anticipos a descontar (C$)', type: 'number', min: 0, help: 'Vacío: anticipos pendientes.' },
            { key: 'otrasdeduccionesliq', label: 'Otras deducciones (C$)', type: 'number', min: 0, defaultValue: '0' },
            { key: 'observaciones', label: 'Observaciones', type: 'textarea', full: true },
        ],
        toPayload: async (payload, { mode, userId, lookups: lk }) => {
            const out = { ...payload };
            if (mode === 'edit') { delete out.empleadoid; return autocompletar(out, lk.empleados.find(e => e.id === (payload.empleadoid ?? undefined))); }
            if (userId != null) out.usuarioid = userId;
            return autocompletar(out, lk.empleados.find(e => e.id === out.empleadoid));
        },
        columns: [
            { header: 'Fecha', muted: true, render: (r) => fmtDate(r.fechaliquidacion) },
            { header: 'Empleado', strong: true, render: (r, lk) => nombreDe(r, lk) },
            { header: 'Salida', render: (r) => <Badge tone="neutral">{labelize(r.tiposalida)}</Badge> },
            { header: 'Total bruto', align: 'right', render: (r) => <span className="tabular">{money(r.totalbruto)}</span> },
            { header: 'Descuentos', align: 'right', render: (r) => <span className="tabular" style={{ color: 'var(--accent-danger)' }}>{money(r.totaldescuentos)}</span> },
            { header: 'Neto a pagar', align: 'right', render: (r) => <span className="tabular" style={{ fontWeight: 700, color: 'var(--accent-success)' }}>{money(r.montoneto)}</span> },
            { header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
        ],
        rowActions: (row, ctx: CrudContext) => <LiquidacionActions row={row} ctx={ctx} />,
        summary: (rows) => [
            { label: 'Liquidaciones', value: rows.length, tone: 'primary' },
            { label: 'Pendientes de pago', value: money(sum(rows.filter(r => r.estado !== 'PAGADO'), r => Number(r.montoneto || 0))), tone: 'danger' },
            { label: 'Pagado', value: money(sum(rows.filter(r => r.estado === 'PAGADO'), r => Number(r.montoneto || 0))), tone: 'success' },
        ],
    };

    return <CrudSection config={config} lookups={lookups} />;
};
