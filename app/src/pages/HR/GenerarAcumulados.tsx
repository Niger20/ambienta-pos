import { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api/axios';
import { getArrayData } from '../../utils/arrayUtils';
import type { CrudContext } from './CrudSection';
import { apiError, periodoLabel, todayISO } from './utils';
import type { Row } from './utils';
import { IconZap } from './icons';
import { ActionButton, FormModal } from './ui';

interface Props {
    endpoint: string;
    title: string;
    ctx: CrudContext;
    /** Devuelve el cuerpo a enviar para el empleado y período dados. */
    buildPayload: (empleado: Row, periodo: Row) => Row;
}

/**
 * Genera el acumulado mensual de todos los empleados activos para un período,
 * omitiendo a quienes ya tienen registro (la combinación empleado + período es única).
 */
export const GenerarAcumulados = ({ endpoint, title, ctx, buildPayload }: Props) => {
    const [show, setShow] = useState(false);
    const [periodoid, setPeriodoid] = useState('');
    const [isRunning, setIsRunning] = useState(false);

    if (ctx.isInactive) return null;

    const run = async (e: React.FormEvent) => {
        e.preventDefault();
        const periodo = ctx.lookups.periodos.find(p => String(p.id) === periodoid);
        if (!periodo) return;
        setIsRunning(true);
        try {
            const existentesRes = await api.get(`${endpoint}?periodoid=${periodo.id}&limit=0`);
            const existentes = new Set(getArrayData(existentesRes.data).map((r: Row) => r.empleadoid));
            const fin = String(periodo.fechafin).slice(0, 10);
            const candidatos = ctx.lookups.empleados.filter(emp =>
                emp.estado !== false && String(emp.fechaingreso).slice(0, 10) <= fin && !existentes.has(emp.id));

            let creados = 0;
            const fallos: string[] = [];
            for (const emp of candidatos) {
                try {
                    await api.post(endpoint, { ...buildPayload(emp, periodo), empleadoid: emp.id, periodoid: periodo.id, fechageneracion: todayISO() });
                    creados++;
                } catch (err: any) {
                    fallos.push(`${emp.nombre} ${emp.apellidos}: ${apiError(err, 'error')}`);
                }
            }
            setShow(false);
            await ctx.reload();
            Swal.fire({
                icon: fallos.length ? 'warning' : 'success',
                title: `${creados} registro${creados !== 1 ? 's' : ''} generado${creados !== 1 ? 's' : ''}`,
                text: fallos.length ? fallos.join(' | ') : `${existentes.size} empleado(s) ya tenían registro en este período.`,
            });
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo generar.'), 'error');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <>
            <ActionButton onClick={() => { setPeriodoid(''); setShow(true); }} tone="primary" title="Generar para todos los empleados activos">
                <IconZap />
                <span>Generar por período</span>
            </ActionButton>
            <FormModal show={show} title={title} icon={<IconZap />} maxWidth="460px" onClose={() => setShow(false)} onSubmit={run} submitLabel={isRunning ? 'Generando...' : 'Generar'}>
                <div className="form-group">
                    <label className="form-label">Período de planilla *</label>
                    <select className="form-input" value={periodoid} onChange={(e) => setPeriodoid(e.target.value)} required>
                        <option value="">Seleccione período...</option>
                        {ctx.lookups.periodos.map(p => <option key={p.id} value={p.id}>{periodoLabel(p)}</option>)}
                    </select>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                        Se crea un registro por cada empleado activo que aún no lo tenga en el período.
                    </div>
                </div>
            </FormModal>
        </>
    );
};
