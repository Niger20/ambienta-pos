import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { IconMonitor, IconTrash, IconAlert, IconCheck } from './icons';
import { getSavedPOSState } from './types';
import { useToast } from './useToast';
import { usePaymentState } from './usePaymentState';
import { useCarrito } from './useCarrito';
import { useProductSearch } from './useProductSearch';
import { useClientes } from './useClientes';
import { useDelivery } from './useDelivery';
import { useTasaCambio } from './useTasaCambio';
import { useTotals } from './useTotals';
import { useCustomerDisplaySync } from './useCustomerDisplaySync';
import { ScannerInput } from './ScannerInput';
import { ClienteSelector } from './ClienteSelector';
import { ProductTable } from './ProductTable';
import { ClienteModal } from './ClienteModal';

const POS = () => {
    // ── Restore from sessionStorage (leído una sola vez) ──
    const savedPOS = getSavedPOSState();

    const { activeSession } = useAuth();
    const sesionActiva = activeSession ? activeSession.id : null;

    const { error, setError, showError, successMsg, setSuccessMsg } = useToast();

    const payment = usePaymentState(savedPOS);
    const { metodoPago, setMetodoPago } = payment;

    const carrito = useCarrito(savedPOS?.lineas || [], showError, setMetodoPago, setSuccessMsg);
    const { lineas, setLineas, agregarProductoAlCarrito } = carrito;

    const search = useProductSearch(agregarProductoAlCarrito, showError);

    const clientesHook = useClientes(savedPOS?.clienteIdSeleccionado || null);
    const {
        clientes, clienteIdSeleccionado, setClienteIdSeleccionado, setBusquedaCliente, clienteSeleccionado,
        showModalCliente, setShowModalCliente, showClientesDropdown, setShowClientesDropdown,
    } = clientesHook;

    const delivery = useDelivery(savedPOS?.lugarVenta || 'NORMAL', savedPOS?.deliveryData, clientes, clienteIdSeleccionado, setError, setSuccessMsg);

    const tasaCambio = useTasaCambio();

    const totals = useTotals(
        lineas, payment.descuentoFactura, payment.tipoDescuentoFactura, delivery.lugarVenta, delivery.deliveryData,
        payment.pagosMixtos, payment.montoRecibidoNIO, payment.montoRecibidoUSD, tasaCambio,
    );

    const { openCustomerDisplay } = useCustomerDisplaySync(
        lineas, setLineas, totals.subtotal, totals.descuentoTotal, totals.total, totals.totalItems,
        carrito.lastAdded, metodoPago, payment.divisaPago,
        totals.montoRecibidoNIONum, totals.cambioNIO, totals.montoRecibidoUSDNum, totals.equivalenteEnCordobas, totals.cambioEnCordobas,
    );

    const clearAll = () => {
        setLineas([]);
        setError('');
        setSuccessMsg('');
        payment.resetPaymentState();
        setClienteIdSeleccionado(null);
        setBusquedaCliente('');
        search.setSearchResults([]);
        search.setShowSearchDropdown(false);
        search.setSearchFocusedIndex(-1);
        clientesHook.setClientFocusedIndex(-1);
        delivery.setLugarFocusedIndex(-1);
        delivery.resetDelivery();
        setShowClientesDropdown(false);
        sessionStorage.removeItem('pos_state');
        search.inputRef.current?.focus();
    };

    // Atajos del cajero disponibles en esta etapa: Esc y F4
    useEffect(() => {
        const handlePOSKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';

            // Escape key to reset and focus scanner
            if (e.key === 'Escape') {
                if (showModalCliente) {
                    setShowModalCliente(false);
                    e.preventDefault();
                } else if (showClientesDropdown) {
                    setShowClientesDropdown(false);
                    e.preventDefault();
                } else {
                    e.preventDefault();
                    search.setInputValue('');
                    search.inputRef.current?.focus();
                }
                return;
            }

            // Let inputs process normally unless it's a global action
            if (isInput && target.id !== 'pos-scanner-input') return;

            // F4 to open/focus client selector
            if (e.key === 'F4') {
                e.preventDefault();
                setShowClientesDropdown(true);
                setTimeout(() => {
                    document.getElementById('pos-client-input')?.focus();
                }, 50);
                return;
            }
        };

        window.addEventListener('keydown', handlePOSKeyDown);
        return () => window.removeEventListener('keydown', handlePOSKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showModalCliente, showClientesDropdown]);

    return (
        <div className="page-container" onClick={() => { setShowClientesDropdown(false); }}>

            {/* ── Header row ── */}
            <div className="pos-header-row">
                <div>
                    <h2 className="pos-header-row__title">
                        Punto de venta
                        <span className={`pos-session-badge ${sesionActiva ? 'pos-session-badge--open' : 'pos-session-badge--closed'}`}>
                            <span className="pos-session-dot" />
                            {sesionActiva ? 'Caja abierta' : 'Caja cerrada'}
                        </span>
                    </h2>
                    <p className="pos-header-row__sub">Escanee o ingrese el código de barras / nombre del producto</p>
                </div>
                <div className="pos-header-row__actions">
                    <button className="btn pos-btn-customer" onClick={openCustomerDisplay}>
                        <IconMonitor /> &nbsp;Pantalla cliente
                    </button>
                    <button className="btn" style={{ backgroundColor: 'var(--accent-danger-bg)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger-border)' }} onClick={clearAll}>
                        <IconTrash /> &nbsp;Limpiar
                    </button>
                </div>
            </div>

            {/* ── Toast messages ── */}
            {error && (
                <div className="pos-toast pos-toast--error" role="alert">
                    <IconAlert />
                    {error}
                </div>
            )}
            {successMsg && (
                <div className="pos-toast pos-toast--success" role="status">
                    <IconCheck />
                    {successMsg}
                </div>
            )}

            {/* ── Keyboard shortcuts ── */}
            <div className="pos-shortcuts-bar">
                <span style={{ fontWeight: 600, fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Atajos</span>
                <span><kbd className="pos-kbd">Esc</kbd> Limpiar buscador</span>
                <span><kbd className="pos-kbd">F4</kbd> Seleccionar cliente</span>
            </div>

            {/* ── Top bar: scanner + client ── */}
            <div className="pos-topbar">
                <ScannerInput
                    inputRef={search.inputRef}
                    inputValue={search.inputValue}
                    setInputValue={search.setInputValue}
                    isSearching={search.isSearching}
                    handleKeyDown={search.handleKeyDown}
                    showSearchDropdown={search.showSearchDropdown}
                    searchResults={search.searchResults}
                    searchFocusedIndex={search.searchFocusedIndex}
                    setShowSearchDropdown={search.setShowSearchDropdown}
                    setSearchResults={search.setSearchResults}
                    agregarProductoAlCarrito={agregarProductoAlCarrito}
                />

                <ClienteSelector
                    clienteSeleccionado={clienteSeleccionado}
                    clienteIdSeleccionado={clienteIdSeleccionado}
                    setClienteIdSeleccionado={setClienteIdSeleccionado}
                    busquedaCliente={clientesHook.busquedaCliente}
                    setBusquedaCliente={setBusquedaCliente}
                    showClientesDropdown={showClientesDropdown}
                    setShowClientesDropdown={setShowClientesDropdown}
                    clientFocusedIndex={clientesHook.clientFocusedIndex}
                    setClientFocusedIndex={clientesHook.setClientFocusedIndex}
                    clientesFiltrados={clientesHook.clientesFiltrados}
                    setShowModalCliente={setShowModalCliente}
                    scannerInputRef={search.inputRef}
                />
            </div>

            {/* ── Carrito ── */}
            <div className="pos-layout">
                <ProductTable
                    lineas={lineas}
                    totalItems={totals.totalItems}
                    lastAdded={carrito.lastAdded}
                    updateCantidad={carrito.updateCantidad}
                    updateDescuento={carrito.updateDescuento}
                    removeLine={carrito.removeLine}
                />
            </div>

            <ClienteModal
                show={showModalCliente}
                onClose={() => setShowModalCliente(false)}
                onCancel={() => {
                    setShowModalCliente(false);
                    clientesHook.setNuevoCliente({ nombre: '', telefono: '', direccion: '', cedula: '', autorizarCredito: false, limitecredito: '' });
                }}
                nuevoCliente={clientesHook.nuevoCliente}
                setNuevoCliente={clientesHook.setNuevoCliente}
                onSubmit={clientesHook.handleCrearCliente}
            />
        </div>
    );
};

export default POS;
