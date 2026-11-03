import { useState } from 'react';
import { useAuthorizedAction, AuthorizationModal } from '../../components/auth';
import { IconCart, IconSupplier } from './icons';
import { usePurchasesData } from './usePurchasesData';
import { useProveedoresCrud } from './useProveedoresCrud';
import { useLineasCompra } from './useLineasCompra';
import { useProductQuickCreate } from './useProductQuickCreate';
import { useNuevaCompra } from './useNuevaCompra';
import { useExcelImport } from './useExcelImport';
import { NuevaCompraTab } from './NuevaCompraTab';
import { SuppliersTab } from './SuppliersTab';
import { ProductQuickCreateModal } from './ProductQuickCreateModal';
import { CategoriaQuickCreateModal } from './CategoriaQuickCreateModal';
import { ProveedorModal } from './ProveedorModal';
import type { ActiveTab } from './types';

const Purchases = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('new');
    const { requestAuth, authModalProps } = useAuthorizedAction();

    const {
        proveedores, setCategorias, categorias, fetchInitialData,
    } = usePurchasesData();

    const [lineas, setLineas] = useLineasCompra();

    const {
        showProductModal, setShowProductModal, pendingBarcode, setPendingBarcode,
        productQueue, setProductQueue, productForm, setProductForm,
        showCategoriaModal, setShowCategoriaModal, categoriaForm, setCategoriaForm,
        handleSaveProduct, handleSaveCategoria,
    } = useProductQuickCreate(setLineas, setCategorias);

    const {
        inputValue, setInputValue, isSearching, searchResults, setSearchResults,
        showSearchDropdown, setShowSearchDropdown, searchFocusedIndex,
        selectedProveedor, setSelectedProveedor,
        busquedaProveedor, setBusquedaProveedor,
        showProveedoresDropdown, setShowProveedoresDropdown, supplierFocusedIndex, setSupplierFocusedIndex,
        tipoCompra, setTipoCompra, metodoPago, setMetodoPago, facturaProveedor, setFacturaProveedor,
        cuotas, setCuotas, fechaVencimiento, setFechaVencimiento, isSaving, inputRef,
        costosAdicionales,
        ordenCompraIdActiva, setOrdenCompraIdActiva,
        agregarProductoALineas, handleKeyDown, removeLine, updateLinea,
        handleAddCostoAdicional, handleRemoveCostoAdicional, handleUpdateCostoAdicional,
        totalDescuentosLineas, total, totalCostosAdicionales, costoTotalAdquisicion,
        proveedoresFiltradosDropdown,
        handleGuardarCompra,
    } = useNuevaCompra(lineas, setLineas, proveedores, setShowProductModal, setPendingBarcode, setProductForm);

    const { excelInputRef, downloadTemplate, handleExcelUpload } = useExcelImport(
        setLineas, setProductQueue, setPendingBarcode, setProductForm, setShowProductModal,
    );

    const {
        proveedorStatusFilter, setProveedorStatusFilter,
        proveedorSearchQuery, setProveedorSearchQuery,
        filteredProveedores,
        showProveedorModal, setShowProveedorModal,
        isEditingProveedor, proveedorForm, setProveedorForm,
        openCreateProveedor, openEditProveedor, handleSaveProveedor, deleteProveedor,
    } = useProveedoresCrud(proveedores, requestAuth, fetchInitialData, setSelectedProveedor);

    const tabBtn = (tab: ActiveTab, label: string, IconComponent: React.ComponentType) => (
        <button
            className={`btn ${activeTab === tab ? 'btn-primary' : ''}`}
            style={{
                backgroundColor: activeTab !== tab ? 'var(--bg-card)' : '',
                color: activeTab !== tab ? 'var(--text-primary)' : '',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: activeTab !== tab ? '1px solid var(--border-color)' : '1px solid var(--accent-primary)',
                transition: 'all 0.2s var(--ease-out)',
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-md)'
            }}
            onClick={() => setActiveTab(tab)}
        >
            <IconComponent />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="page-container" onClick={() => { setShowProveedoresDropdown(false); setProductQueue([]); setShowSearchDropdown(false); setSearchResults([]); }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0, border: 'none', marginBottom: '1rem' }}>
                <div>
                    <h2 className="card-title" style={{ fontSize: '1.5rem' }}>Compras & Proveedores</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Registrar adquisiciones de inventario.</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {tabBtn('new', 'Nueva Compra', IconCart)}
                {tabBtn('suppliers', 'Proveedores', IconSupplier)}
            </div>

            {activeTab === 'new' && (
                <NuevaCompraTab
                    ordenCompraIdActiva={ordenCompraIdActiva}
                    setOrdenCompraIdActiva={setOrdenCompraIdActiva}
                    inputRef={inputRef}
                    isSearching={isSearching}
                    inputValue={inputValue}
                    setInputValue={setInputValue}
                    handleKeyDown={handleKeyDown}
                    showSearchDropdown={showSearchDropdown}
                    searchResults={searchResults}
                    searchFocusedIndex={searchFocusedIndex}
                    setShowSearchDropdown={setShowSearchDropdown}
                    setSearchResults={setSearchResults}
                    agregarProductoALineas={agregarProductoALineas}
                    downloadTemplate={downloadTemplate}
                    excelInputRef={excelInputRef}
                    handleExcelUpload={handleExcelUpload}
                    lineas={lineas}
                    updateLinea={updateLinea}
                    removeLine={removeLine}
                    selectedProveedor={selectedProveedor}
                    setSelectedProveedor={setSelectedProveedor}
                    busquedaProveedor={busquedaProveedor}
                    setBusquedaProveedor={setBusquedaProveedor}
                    showProveedoresDropdown={showProveedoresDropdown}
                    setShowProveedoresDropdown={setShowProveedoresDropdown}
                    supplierFocusedIndex={supplierFocusedIndex}
                    setSupplierFocusedIndex={setSupplierFocusedIndex}
                    proveedoresFiltradosDropdown={proveedoresFiltradosDropdown}
                    proveedores={proveedores}
                    openCreateProveedor={openCreateProveedor}
                    tipoCompra={tipoCompra}
                    setTipoCompra={setTipoCompra}
                    metodoPago={metodoPago}
                    setMetodoPago={setMetodoPago}
                    cuotas={cuotas}
                    setCuotas={setCuotas}
                    fechaVencimiento={fechaVencimiento}
                    setFechaVencimiento={setFechaVencimiento}
                    facturaProveedor={facturaProveedor}
                    setFacturaProveedor={setFacturaProveedor}
                    costosAdicionales={costosAdicionales}
                    handleAddCostoAdicional={handleAddCostoAdicional}
                    handleUpdateCostoAdicional={handleUpdateCostoAdicional}
                    handleRemoveCostoAdicional={handleRemoveCostoAdicional}
                    totalCostosAdicionales={totalCostosAdicionales}
                    totalDescuentosLineas={totalDescuentosLineas}
                    total={total}
                    costoTotalAdquisicion={costoTotalAdquisicion}
                    isSaving={isSaving}
                    handleGuardarCompra={handleGuardarCompra}
                    setLineas={setLineas}
                />
            )}

            {activeTab === 'suppliers' && (
                <SuppliersTab
                    proveedorSearchQuery={proveedorSearchQuery}
                    setProveedorSearchQuery={setProveedorSearchQuery}
                    proveedorStatusFilter={proveedorStatusFilter}
                    setProveedorStatusFilter={setProveedorStatusFilter}
                    openCreateProveedor={openCreateProveedor}
                    filteredProveedores={filteredProveedores}
                    openEditProveedor={openEditProveedor}
                    deleteProveedor={deleteProveedor}
                />
            )}

            <ProductQuickCreateModal
                show={showProductModal}
                pendingBarcode={pendingBarcode}
                productQueue={productQueue}
                productForm={productForm}
                setProductForm={setProductForm}
                categorias={categorias}
                setShowCategoriaModal={setShowCategoriaModal}
                handleSaveProduct={handleSaveProduct}
                onClose={() => { setShowProductModal(false); setProductQueue([]); }}
            />

            <CategoriaQuickCreateModal
                show={showCategoriaModal}
                categoriaForm={categoriaForm}
                setCategoriaForm={setCategoriaForm}
                handleSaveCategoria={handleSaveCategoria}
                onClose={() => setShowCategoriaModal(false)}
            />

            <ProveedorModal
                show={showProveedorModal}
                isEditing={isEditingProveedor}
                proveedorForm={proveedorForm}
                setProveedorForm={setProveedorForm}
                handleSaveProveedor={handleSaveProveedor}
                onClose={() => setShowProveedorModal(false)}
            />

            <AuthorizationModal {...authModalProps} />
        </div>
    );
};

export default Purchases;
