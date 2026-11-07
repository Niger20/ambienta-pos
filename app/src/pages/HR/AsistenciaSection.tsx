import { CrudSection } from './CrudSection';
import type { CrudConfig } from './CrudSection';
import type { Lookups } from './useLookups';
import { empleadoNombre, fmtDate, fmtTime, num, optsFrom, round2, todayISO } from './utils';
import { IconClock } from './icons';
import { Badge } from './ui';

const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

export const AsistenciaSection = ({ lookups }: { lookups: Lookups }) => {
    const config: CrudConfig = {
        endpoint: '/registro-asistencia',
        singular: 'Registro de asistencia',
        newLabel: 'Registrar Asistencia',
        icon: <IconClock />,
        modalWidth: '640px',
        searchPlaceholder: 'Buscar por empleado...',
        deleteTitle: '¿Eliminar registro?',
        searchText: (r) => r.empleadonombre || empleadoNombre(lookups.empleados.find(e => e.id === r.empleadoid)),
        filters: [
            { key: 'empleadoid', label: 'Todos los empleados', options: (lk) => lk.empleados.map(e => ({ value: e.id, label: empleadoNombre(e) })) },
            { key: 'fechainicio', label: 'Desde', type: 'date' },
            { key: 'fechafin', label: 'Hasta', type: 'date' },
        ],
        fields: [
            { key: 'empleadoid', label: 'Empleado', type: 'select', numeric: true, required: true, options: (lk) => lk.empleados.filter(e => e.estado !== false).map(e => ({ value: e.id, label: empleadoNombre(e) })) },
            { key: 'fecha', label: 'Fecha', type: 'date', required: true, defaultValue: todayISO() },
            { key: 'horaentrada', label: 'Hora de entrada', type: 'time' },
            { key: 'horasalida', label: 'Hora de salida', type: 'time' },
            { key: 'horastrabajadas', label: 'Horas trabajadas', type: 'number', min: 0, max: 24, step: '0.25', help: 'Se calcula con entrada y salida si se deja vacío.' },
            { key: 'horasextra', label: 'Horas extra', type: 'number', min: 0, max: 24, step: '0.25', help: 'Se calcula contra la jornada del empleado si se deja vacío.' },
            { key: 'tipoausencia', label: 'Tipo de ausencia', type: 'select', options: optsFrom(['PERMISO', 'ENFERMEDAD', 'INJUSTIFICADA', 'VACACION', 'FERIADO']) },
            { key: 'observaciones', label: 'Observaciones', type: 'textarea', full: true },
        ],
        toPayload: (payload, { form }) => {
            const out = { ...payload };
            const fecha = String(form.fecha || '');
            // Las columnas TIME se guardan como hora UTC literal para que lo digitado sea lo mostrado.
            delete out.horaentrada;
            delete out.horasalida;
            if (fecha && form.horaentrada) out.horaentrada = `${fecha}T${form.horaentrada}:00.000Z`;
            if (fecha && form.horasalida) out.horasalida = `${fecha}T${form.horasalida}:00.000Z`;

            let trabajadas = out.horastrabajadas as number | undefined;
            if (trabajadas == null && form.horaentrada && form.horasalida) {
                const diff = timeToMinutes(form.horasalida) - timeToMinutes(form.horaentrada);
                if (diff > 0) {
                    trabajadas = round2(diff / 60);
                    out.horastrabajadas = trabajadas;
                }
            }
            if (out.horasextra == null && trabajadas != null) {
                const emp = lookups.empleados.find(e => e.id === out.empleadoid);
                const jornada = Number(emp?.horasdiariasjornada || 8);
                out.horasextra = Math.max(0, round2(trabajadas - jornada));
            }
            return out;
        },
        columns: [
            { header: 'Fecha', muted: true, render: (r) => fmtDate(r.fecha) },
            { header: 'Empleado', strong: true, render: (r) => r.empleadonombre || empleadoNombre(lookups.empleados.find(e => e.id === r.empleadoid)) },
            { header: 'Entrada', render: (r) => <span className="tabular">{fmtTime(r.horaentrada)}</span> },
            { header: 'Salida', render: (r) => <span className="tabular">{fmtTime(r.horasalida)}</span> },
            { header: 'Horas', align: 'right', render: (r) => <span className="tabular">{r.horastrabajadas != null ? num(r.horastrabajadas) : '—'}</span> },
            { header: 'Extra', align: 'right', render: (r) => <span className="tabular">{num(r.horasextra)}</span> },
            { header: 'Ausencia', render: (r) => r.tipoausencia ? <Badge tone={r.tipoausencia === 'INJUSTIFICADA' ? 'danger' : 'warning'}>{r.tipoausencia.replace(/_/g, ' ')}</Badge> : <Badge tone="success">Presente</Badge> },
            { header: 'Observaciones', muted: true, render: (r) => r.observaciones || '—' },
        ],
        summary: (rows) => [
            { label: 'Registros', value: rows.length, tone: 'primary' },
            { label: 'Horas trabajadas', value: num(rows.reduce((s, r) => s + Number(r.horastrabajadas || 0), 0)) },
            { label: 'Horas extra', value: num(rows.reduce((s, r) => s + Number(r.horasextra || 0), 0)), tone: 'success' },
            { label: 'Ausencias', value: rows.filter(r => r.tipoausencia).length, tone: 'danger' },
        ],
    };

    return <CrudSection config={config} lookups={lookups} />;
};
