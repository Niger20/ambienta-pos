import { useState } from 'react';
import { IconSearch, IconPlus, IconEdit, IconTrash } from './icons';
import type { Category, Subcategory } from './types';

interface CategoriesTabProps {
    categorySearchQuery: string;
    setCategorySearchQuery: (v: string) => void;
    onCreateCategory: () => void;
    isLoading: boolean;
    error: string;
    categorySortBy: string;
    categorySortOrder: string;
    handleCategorySort: (column: string) => void;
    filteredCategories: Category[];
    onEditCategory: (category: Category) => void;
    onDeleteCategory: (id: number) => void;
    subcategories: Subcategory[];
    onCreateSubcategory: (categoriaid: number) => void;
    onEditSubcategory: (sub: Subcategory) => void;
    onDeleteSubcategory: (sub: Subcategory) => void;
}

const smallBtn = {
    padding: '0.35rem 0.65rem',
    fontSize: '0.78rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    borderRadius: 'var(--radius-md)',
} as const;

export const CategoriesTab = ({
    categorySearchQuery, setCategorySearchQuery, onCreateCategory,
    isLoading, error,
    categorySortBy, categorySortOrder, handleCategorySort,
    filteredCategories, onEditCategory, onDeleteCategory,
    subcategories, onCreateSubcategory, onEditSubcategory, onDeleteSubcategory,
}: CategoriesTabProps) => {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <div className="form-input" style={{ display: 'flex', alignItems: 'center', flex: '1 1 200px', maxWidth: '300px', padding: '0 10px', gap: '8px', height: '36px', border: '2px solid var(--border-color)', borderRadius: '12px' }}>
                    <IconSearch />
                    <input
                        type="text"
                        placeholder="Buscar categoría..."
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '0.9rem', padding: 0 }}
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        className="btn"
                        onClick={() => handleCategorySort('name')}
                        style={{ ...smallBtn, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                        title="Ordenar por nombre"
                    >
                        <span>Nombre {categorySortBy === 'name' && (categorySortOrder === 'asc' ? '↑' : '↓')}</span>
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={onCreateCategory}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
                    >
                        <IconPlus />
                        <span>Nueva Categoría</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando categorías...</div>
            ) : error ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-danger)' }}>{error}</div>
            ) : filteredCategories.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No se encontraron categorías.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredCategories.map(category => {
                        const isExpanded = expandedId === category.id;
                        const subs = subcategories.filter(s => s.categoriaid === category.id);

                        return (
                            <div
                                key={category.id}
                                style={{
                                    border: '1px solid var(--border-color)',
                                    borderLeft: isExpanded ? '3px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    backgroundColor: 'var(--bg-card)',
                                    transition: 'border-left 0.15s ease-in-out',
                                }}
                            >
                                {/* Categoría principal */}
                                <div
                                    style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', cursor: 'pointer', backgroundColor: isExpanded ? 'var(--accent-primary-bg)' : 'transparent', transition: 'background-color 0.2s', flexWrap: 'wrap' }}
                                    onClick={() => setExpandedId(isExpanded ? null : category.id)}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{category.name}</div>
                                        {category.description && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{category.description}</div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <span>{subs.length} subcategoría{subs.length !== 1 ? 's' : ''}</span>
                                        <button
                                            className="btn"
                                            onClick={(e) => { e.stopPropagation(); onEditCategory(category); }}
                                            style={{ ...smallBtn, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 500 }}
                                            title="Editar categoría"
                                        >
                                            <IconEdit />
                                            <span>Editar</span>
                                        </button>
                                        <button
                                            className="btn"
                                            onClick={(e) => { e.stopPropagation(); onDeleteCategory(category.id); }}
                                            style={{ ...smallBtn, backgroundColor: 'var(--accent-danger-bg)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)', fontWeight: 600 }}
                                            title="Eliminar categoría"
                                        >
                                            <IconTrash />
                                            <span>Eliminar</span>
                                        </button>
                                        <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '0.9rem' }}>▼</span>
                                    </div>
                                </div>

                                {/* Subcategorías */}
                                {isExpanded && (
                                    <div style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                Subcategorías de <strong style={{ color: 'var(--text-primary)' }}>{category.name}</strong>
                                            </span>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => onCreateSubcategory(category.id)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
                                            >
                                                <IconPlus />
                                                <span>Nueva Subcategoría</span>
                                            </button>
                                        </div>

                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                        <th style={{ padding: '0.75rem 1.25rem', fontWeight: 500 }}>Subcategoría</th>
                                                        <th style={{ padding: '0.75rem 1.25rem', fontWeight: 500 }}>Descripción</th>
                                                        <th style={{ padding: '0.75rem 1.25rem', fontWeight: 500, textAlign: 'right' }}>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {subs.map(sub => (
                                                        <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                            <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sub.name}</td>
                                                            <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-secondary)' }}>{sub.description || '-'}</td>
                                                            <td style={{ padding: '0.6rem 1.25rem', textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                                    <button
                                                                        className="btn"
                                                                        onClick={() => onEditSubcategory(sub)}
                                                                        style={{ ...smallBtn, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 500 }}
                                                                    >
                                                                        <IconEdit />
                                                                        <span>Editar</span>
                                                                    </button>
                                                                    <button
                                                                        className="btn"
                                                                        onClick={() => onDeleteSubcategory(sub)}
                                                                        style={{ ...smallBtn, backgroundColor: 'var(--accent-danger-bg)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)', fontWeight: 600 }}
                                                                    >
                                                                        <IconTrash />
                                                                        <span>Eliminar</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {subs.length === 0 && (
                                                        <tr>
                                                            <td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Esta categoría aún no tiene subcategorías.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
