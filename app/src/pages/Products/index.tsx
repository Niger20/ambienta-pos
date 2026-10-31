import type { Subcategory } from './types';
import { useState } from 'react';
import { useAuthorizedAction, AuthorizationModal } from '../../components/auth';
import { IconBox, IconTag, IconPlus } from './icons';
import { useProductsData } from './useProductsData';
import { useProductCrud } from './useProductCrud';
import { useCategoryCrud } from './useCategoryCrud';
import { useSubcategoryCrud } from './useSubcategoryCrud';
import { useProductsFilters } from './useProductsFilters';
import { useCategoriesFilters } from './useCategoriesFilters';
import { ProductsTab } from './ProductsTab';
import { CategoriesTab } from './CategoriesTab';
import { ProductModal } from './ProductModal';
import { CategoryModal } from './CategoryModal';
import { SubcategoryModal } from './SubcategoryModal';

const Products = () => {
    const { requestAuth, authModalProps } = useAuthorizedAction();
    const [activeTab, setActiveTab] = useState('products');

    const { products, categories, unidadesMedida, isLoading, error, fetchData } = useProductsData();
    const mainCategories = categories.filter(c => !c.parentId);
    const subcategories: Subcategory[] = categories
        .filter(c => c.parentId)
        .map(c => ({ id: c.id, categoriaid: c.parentId as number, name: c.name, description: c.description }));

    // Estado de productForm se declara primero porque tanto el CRUD de producto
    // como el de categoría necesitan referenciarlo (categoría se crea "en línea"
    // desde el modal de producto).
    const productCrud = useProductCrud(categories, unidadesMedida, fetchData, requestAuth, () => openCreateCategoryModal());

    const {
        isProductModalOpen, setIsProductModalOpen,
        isEditingProduct,
        productForm, setProductForm,
        openCreateProductModal, editProduct, deleteProduct,
        handleProductInputChange, handleBarcodeKeyDown, handleCreateProduct,
    } = productCrud;

    const {
        isCategoryModalOpen, setIsCategoryModalOpen,
        isEditingCategory,
        categoryForm, setCategoryForm,
        openCreateCategoryModal, editCategory, deleteCategory, handleCreateCategory,
    } = useCategoryCrud(fetchData, requestAuth, (categoryId: string) => {
        setProductForm(prev => ({ ...prev, categoriaid: categoryId }));
    });

    const {
        productSearchQuery, setProductSearchQuery,
        productCategoryFilter, setProductCategoryFilter,
        productSortBy, productSortOrder, handleProductSort,
        filteredProducts, productPage, setProductPage, totalProductPages, paginatedProducts,
    } = useProductsFilters(products);

    const {
        categorySearchQuery, setCategorySearchQuery,
        categorySortBy, categorySortOrder, handleCategorySort, filteredCategories,
    } = useCategoriesFilters(mainCategories);

    const {
        isSubcategoryModalOpen, setIsSubcategoryModalOpen,
        isEditingSubcategory, parentCategory,
        subcategoryForm, setSubcategoryForm,
        openCreateSubcategoryModal, editSubcategory, deleteSubcategory, handleSaveSubcategory,
    } = useSubcategoryCrud(categories, fetchData, requestAuth);

    return (
        <>
            <div className="page-container">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0, border: 'none', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 className="card-title" style={{ fontSize: '1.5rem' }}>Manejo de Inventario</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Organizar productos y categorías.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-primary"
                            onClick={openCreateProductModal}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 600
                            }}
                        >
                            <IconPlus />
                            <span>Nuevo Producto</span>
                        </button>
                    </div>
                </div>

                {/* Menu Tabs */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    {[
                        { tab: 'products', label: 'Productos', icon: IconBox },
                        { tab: 'categories', label: 'Categorías', icon: IconTag },
                    ].map(item => {
                        const TabIcon = item.icon;
                        const isActive = activeTab === item.tab;
                        return (
                            <button
                                key={item.tab}
                                className={`btn ${isActive ? 'btn-primary' : ''}`}
                                onClick={() => setActiveTab(item.tab)}
                                style={{
                                    padding: '0.6rem 1.2rem',
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap',
                                    backgroundColor: !isActive ? 'var(--bg-card)' : '',
                                    color: !isActive ? 'var(--text-primary)' : '',
                                    border: !isActive ? '1px solid var(--border-color)' : '1px solid var(--accent-primary)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    transition: 'all 0.2s var(--ease-out)'
                                }}
                            >
                                <TabIcon />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="card">
                    {activeTab === 'products' ? (
                        <ProductsTab
                            productSearchQuery={productSearchQuery}
                            setProductSearchQuery={setProductSearchQuery}
                            productCategoryFilter={productCategoryFilter}
                            setProductCategoryFilter={setProductCategoryFilter}
                            categories={categories}
                            isLoading={isLoading}
                            error={error}
                            productSortBy={productSortBy}
                            productSortOrder={productSortOrder}
                            handleProductSort={handleProductSort}
                            paginatedProducts={paginatedProducts}
                            filteredProducts={filteredProducts}
                            productPage={productPage}
                            setProductPage={setProductPage}
                            totalProductPages={totalProductPages}
                            onEditProduct={editProduct}
                            onDeleteProduct={deleteProduct}
                        />
                    ) : activeTab === 'categories' ? (
                        <CategoriesTab
                            categorySearchQuery={categorySearchQuery}
                            setCategorySearchQuery={setCategorySearchQuery}
                            onCreateCategory={openCreateCategoryModal}
                            isLoading={isLoading}
                            error={error}
                            categorySortBy={categorySortBy}
                            categorySortOrder={categorySortOrder}
                            handleCategorySort={handleCategorySort}
                            filteredCategories={filteredCategories}
                            onEditCategory={editCategory}
                            onDeleteCategory={deleteCategory}
                            subcategories={subcategories}
                            onCreateSubcategory={openCreateSubcategoryModal}
                            onEditSubcategory={editSubcategory}
                            onDeleteSubcategory={deleteSubcategory}
                        />
                    ) : null}
                </div>

                <ProductModal
                    show={isProductModalOpen}
                    isEditing={isEditingProduct}
                    form={productForm}
                    setForm={setProductForm}
                    onInputChange={handleProductInputChange}
                    onBarcodeKeyDown={handleBarcodeKeyDown}
                    onSubmit={handleCreateProduct}
                    onClose={() => setIsProductModalOpen(false)}
                    categories={categories}
                    unidadesMedida={unidadesMedida}
                />

                <CategoryModal
                    show={isCategoryModalOpen}
                    isEditing={isEditingCategory}
                    form={categoryForm}
                    onChange={setCategoryForm}
                    onSubmit={handleCreateCategory}
                    onCancel={() => {
                        setIsCategoryModalOpen(false);
                        if (!isEditingCategory) {
                            setProductForm(prev => ({ ...prev, categoriaid: '' }));
                        }
                    }}
                />

                <SubcategoryModal
                    show={isSubcategoryModalOpen}
                    isEditing={isEditingSubcategory}
                    parentCategory={parentCategory}
                    form={subcategoryForm}
                    onChange={setSubcategoryForm}
                    onSubmit={handleSaveSubcategory}
                    onCancel={() => setIsSubcategoryModalOpen(false)}
                />
            </div>

            <AuthorizationModal {...authModalProps} />
        </>
    );
};

export default Products;
