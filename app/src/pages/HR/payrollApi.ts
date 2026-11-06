import api from '../../api/axios';
import { getArrayData } from '../../utils/arrayUtils';
import type { Row } from './utils';
import { round2 } from './utils';

/**
 * Recalcula el monto pagado de un préstamo a partir de sus cuotas y ajusta su estado.
 * El API no lo hace al cambiar una cuota, así que lo mantenemos coherente desde aquí.
 */
export async function syncPrestamo(prestamoid: number): Promise<void> {
    const [cuotasRes, prestamoRes] = await Promise.all([
        api.get(`/cuotas-prestamos?prestamoid=${prestamoid}&limit=0`),
        api.get(`/prestamos-empleados/${prestamoid}`),
    ]);
    const cuotas: Row[] = getArrayData(cuotasRes.data);
    const prestamo: Row = prestamoRes.data;
    if (!prestamo || prestamo.estado === 'CANCELADO') return;

    const pagado = round2(cuotas.filter(c => c.estado === 'PAGADA').reduce((s, c) => s + Number(c.montocuota || 0), 0));
    const todasPagadas = cuotas.length > 0 && cuotas.every(c => c.estado === 'PAGADA');
    await api.put(`/prestamos-empleados/${prestamoid}`, {
        montopagado: pagado,
        estado: todasPagadas ? 'PAGADO' : 'ACTIVO',
    });
}
