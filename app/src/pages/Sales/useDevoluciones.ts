import { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api/axios';
import { getArrayData } from '../../utils/arrayUtils';
import { useAuth } from '../../context/AuthContext';
import type { Venta } from './types';

export interface LineaDevolucion {
    productoid: number;
    nombre: string;
    vendida: number;
    devuelta: number;
    disponible: number;
    /** Monto neto por unidad (precio menos descuentos de línea y de factura). */
    montoUnitario: number;
}

export interface LineaCambio {
    productoid: number;
    nombre: string;
    precio: number;
    stock: number;
    cantidad: string;
}

export type TipoDevolucion = 'REEMBOLSO' | 'CAMBIO';
export type MetodoDevolucion = 'EFECTIVO' | 'TARJETA' | 'BAC' | 'LAFISE';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function useDevoluciones(
    requestAuth: (accion: string, detalle: string, onSuccess: () => Promise<void>) => Promise<void>,
    fetchData: () => Promise<void>,
) {
    const { user, activeSession } = useAuth();

    const [devoluciones, setDevoluciones] = useState<any[]>([]);
    const [loadingDevoluciones, setLoadingDevoluciones] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
    const [lineas, setLineas] = useState<LineaDevolucion[]>([]);
    const [loadingLineas, setLoadingLineas] = useState(false);
    const [cantidades, setCantidades] = useState<Record<number, string>>({});
    const [motivo, setMotivo] = useState('');
    const [saving, setSaving] = useState(false);

    const [tipo, setTipo] = useState<TipoDevolucion>('REEMBOLSO');
    const [metodo, setMetodo] = useState<MetodoDevolucion>('EFECTIVO');
    const [referencia, setReferencia] = useState('');
    const [cambioLineas, setCambioLineas] = useState<LineaCambio[]>([]);
    /** Saldo pendiente de la cuenta por cobrar de la venta (0 si no es a crédito o ya está pagada). */
    const [saldoCuenta, setSaldoCuenta] = useState(0);

    const fetchDevoluciones = async () => {
        setLoadingDevoluciones(true);
        try {
            const res = await api.get('/devoluciones?limit=0');
            setDevoluciones(getArrayData(res.data, 'devoluciones'));
        } catch (error) {
            console.error('Error fetching devoluciones:', error);
            setDevoluciones([]);
        } finally {
            setLoadingDevoluciones(false);
        }
    };

    const selectVenta = async (venta: Venta) => {
        setVentaSeleccionada(venta);
        setCantidades({});
        setLineas([]);
        setSaldoCuenta(0);
        setLoadingLineas(true);
        try {
            const ventaId = venta.id ?? venta.ventaid;
            const [lineasRes, devRes, cuentasRes] = await Promise.all([
                api.get(`/venta-productos/venta/${ventaId}`),
                api.get(`/devoluciones?ventaid=${ventaId}&limit=0`),
                api.get('/cuentas-por-cobrar?limit=0').catch(() => ({ data: [] })),
            ]);
            const detalles: any[] = getArrayData(lineasRes.data);
            const previas: any[] = getArrayData(devRes.data, 'devoluciones');

            const cuenta = getArrayData<any>(cuentasRes.data).find(c => Number(c.ventaid) === Number(ventaId) && c.estado !== 'ANULADA');
            setSaldoCuenta(cuenta ? Math.max(0, Number(cuenta.montorestante ?? (Number(cuenta.montototal) - Number(cuenta.montopagado || 0)))) : 0);

            const subtotal = detalles.reduce((s, d) => s + Number(d.totalproducto ?? (Number(d.cantidad) * Number(d.preciounitario) - Number(d.descuento || 0))), 0);
            const descFactura = Number(venta.descuentofactura || 0);
            const factor = subtotal > 0 ? Math.max(0, 1 - descFactura / subtotal) : 1;

            setLineas(detalles.map(d => {
                const vendida = Number(d.cantidad);
                const devuelta = previas.filter(p => p.productoid === d.productoid).reduce((s, p) => s + Number(p.cantidad), 0);
                const neto = Number(d.totalproducto ?? (vendida * Number(d.preciounitario) - Number(d.descuento || 0)));
                return {
                    productoid: d.productoid,
                    nombre: d.productonombre || d.productos?.nombre || `Producto #${d.productoid}`,
                    vendida,
                    devuelta,
                    disponible: Math.max(0, round2(vendida - devuelta)),
                    montoUnitario: vendida > 0 ? (neto * factor) / vendida : 0,
                };
            }));
        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudieron cargar los productos de la venta.', 'error');
            setVentaSeleccionada(null);
        } finally {
            setLoadingLineas(false);
        }
    };

    const resetForm = () => {
        setMotivo('');
        setCantidades({});
        setLineas([]);
        setVentaSeleccionada(null);
        setTipo('REEMBOLSO');
        setMetodo('EFECTIVO');
        setReferencia('');
        setCambioLineas([]);
        setSaldoCuenta(0);
    };

    const openModal = (venta?: Venta) => {
        resetForm();
        setShowModal(true);
        if (venta) selectVenta(venta);
    };

    const closeModal = () => setShowModal(false);

    const resetVenta = () => {
        setVentaSeleccionada(null);
        setLineas([]);
        setCantidades({});
        setSaldoCuenta(0);
    };

    // ── Productos del cambio ────────────────────────────────────────────
    const buscarProductos = async (q: string): Promise<any[]> => {
        const trimmed = q.trim();
        if (!trimmed) return [];
        try {
            const res = await api.get(`/productos/search?q=${encodeURIComponent(trimmed)}`);
            return getArrayData(res.data, 'productos');
        } catch {
            return [];
        }
    };

    const agregarProductoCambio = (p: any) => {
        const id = Number(p.id ?? p.productoid);
        setCambioLineas(prev => prev.some(l => l.productoid === id)
            ? prev
            : [...prev, { productoid: id, nombre: p.nombre, precio: Number(p.precioventa || 0), stock: Number(p.stockactual || 0), cantidad: '1' }]);
    };

    const cambiarCantidadCambio = (productoid: number, cantidad: string) =>
        setCambioLineas(prev => prev.map(l => (l.productoid === productoid ? { ...l, cantidad } : l)));

    const quitarProductoCambio = (productoid: number) =>
        setCambioLineas(prev => prev.filter(l => l.productoid !== productoid));

    // ── Cálculos de la vista previa (el API calcula lo definitivo) ──────
    const montoLinea = (l: LineaDevolucion) => round2(Number(cantidades[l.productoid] || 0) * l.montoUnitario);
    const lineasADevolver = lineas.filter(l => Number(cantidades[l.productoid] || 0) > 0);
    const totalDevolucion = round2(lineasADevolver.reduce((s, l) => s + montoLinea(l), 0));
    const totalCambio = round2(cambioLineas.reduce((s, l) => s + Number(l.cantidad || 0) * l.precio, 0));
    const acreditado = round2(Math.min(totalDevolucion, saldoCuenta));
    const reembolso = round2(totalDevolucion - acreditado);
    const requiereCaja = reembolso > 0 || tipo === 'CAMBIO';
    const sinSesion = requiereCaja && !activeSession;
    const requiereMetodo = tipo === 'CAMBIO' || reembolso > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ventaSeleccionada) return;
        if (lineasADevolver.length === 0) { Swal.fire('Atención', 'Indique la cantidad a devolver de al menos un producto.', 'warning'); return; }
        const excedida = lineasADevolver.find(l => Number(cantidades[l.productoid]) > l.disponible);
        if (excedida) { Swal.fire('Atención', `Solo se pueden devolver ${excedida.disponible} unidades de "${excedida.nombre}".`, 'warning'); return; }
        if (!motivo.trim()) { Swal.fire('Atención', 'Ingrese el motivo de la devolución.', 'warning'); return; }

        const lineasCambio = cambioLineas.filter(l => Number(l.cantidad) > 0);
        if (tipo === 'CAMBIO') {
            if (lineasCambio.length === 0) { Swal.fire('Atención', 'Agregue al menos un producto para el cambio.', 'warning'); return; }
            const sinStock = lineasCambio.find(l => Number(l.cantidad) > l.stock);
            if (sinStock) { Swal.fire('Atención', `Stock insuficiente de "${sinStock.nombre}" (disponible ${sinStock.stock}).`, 'warning'); return; }
        }
        if (requiereMetodo && (metodo === 'BAC' || metodo === 'LAFISE') && !referencia.trim()) {
            Swal.fire('Atención', 'Ingrese el número de transferencia.', 'warning'); return;
        }
        if (sinSesion) { Swal.fire('Atención', 'Debe haber una sesión de caja activa para registrar reembolsos o cambios.', 'warning'); return; }

        const descripcion = tipo === 'CAMBIO'
            ? `Se repondrán ${lineasADevolver.length} producto(s) (C$ ${totalDevolucion.toFixed(2)}) y se entregarán productos por C$ ${totalCambio.toFixed(2)}.`
            : `Se repondrán ${lineasADevolver.length} producto(s) al inventario por C$ ${totalDevolucion.toFixed(2)}.`;
        const confirm = await Swal.fire({
            title: tipo === 'CAMBIO' ? '¿Registrar cambio?' : '¿Registrar devolución?',
            text: descripcion, icon: 'question', showCancelButton: true,
            confirmButtonText: 'Registrar', cancelButtonText: 'Cancelar',
        });
        if (!confirm.isConfirmed) return;

        setSaving(true);
        try {
            const res = await api.post('/devoluciones/procesar', {
                ventaid: ventaSeleccionada.id ?? ventaSeleccionada.ventaid,
                usuarioid: Number(user?.id),
                motivo: motivo.trim(),
                tipo,
                metodopago: requiereMetodo ? metodo : undefined,
                numerotransferencia: requiereMetodo && (metodo === 'BAC' || metodo === 'LAFISE') ? referencia.trim() : undefined,
                lineas: lineasADevolver.map(l => ({ productoid: l.productoid, cantidad: Number(cantidades[l.productoid]) })),
                cambio: tipo === 'CAMBIO' ? lineasCambio.map(l => ({ productoid: l.productoid, cantidad: Number(l.cantidad) })) : [],
            });
            const r = res.data?.resumen;
            setShowModal(false);
            await Promise.all([fetchDevoluciones(), fetchData()]);

            const partes: string[] = [];
            if (r?.totalAcreditado > 0) partes.push(`Descontado de la deuda del cliente: C$ ${Number(r.totalAcreditado).toFixed(2)}`);
            if (r?.totalReembolsado > 0) partes.push(`Reembolsado por ${metodo}: C$ ${Number(r.totalReembolsado).toFixed(2)}`);
            if (res.data?.ventacambio) partes.push(`Venta del cambio: #${res.data.ventacambio.id} por C$ ${Number(r.totalCambio).toFixed(2)}`);
            Swal.fire({ icon: 'success', title: tipo === 'CAMBIO' ? 'Cambio registrado' : 'Devolución registrada', html: partes.join('<br/>') || undefined });
        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo registrar la devolución.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (dev: any) => {
        const efectos: string[] = ['Se descontará nuevamente del inventario la cantidad devuelta.'];
        if (Number(dev.montoacreditado) > 0) efectos.push(`La deuda del cliente vuelve a subir C$ ${Number(dev.montoacreditado).toFixed(2)}.`);
        if (Number(dev.montoreembolsado) > 0) efectos.push(`Se anula el reembolso de C$ ${Number(dev.montoreembolsado).toFixed(2)}.`);
        const result = await Swal.fire({
            title: '¿Eliminar devolución?',
            text: efectos.join(' '),
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444',
            confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        await requestAuth('ELIMINAR_DEVOLUCION', `Eliminar devolución #${dev.id} (venta #${dev.ventaid})`, async () => {
            try {
                await api.delete(`/devoluciones/${dev.id}`);
                Swal.fire({ icon: 'success', title: 'Devolución eliminada', timer: 1500, showConfirmButton: false });
                await Promise.all([fetchDevoluciones(), fetchData()]);
            } catch (err: any) {
                Swal.fire('Error', err.response?.data?.error || 'No se pudo eliminar la devolución.', 'error');
            }
        });
    };

    return {
        devoluciones, loadingDevoluciones, fetchDevoluciones,
        showModal, openModal, closeModal,
        ventaSeleccionada, selectVenta, resetVenta, lineas, loadingLineas,
        cantidades, setCantidades, motivo, setMotivo, saving,
        tipo, setTipo, metodo, setMetodo, referencia, setReferencia,
        cambioLineas, buscarProductos, agregarProductoCambio, cambiarCantidadCambio, quitarProductoCambio,
        montoLinea, totalDevolucion, totalCambio, saldoCuenta, acreditado, reembolso, requiereMetodo, sinSesion,
        handleSubmit, handleDelete,
    };
}
