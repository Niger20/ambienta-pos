import type { Category } from './types';

interface SubcategoryForm {
    nombre: string;
    descripcion: string;
}

interface SubcategoryModalProps {
    show: boolean;
    isEditing: boolean;
    parentCategory: Category | null;
    form: SubcategoryForm;
    onChange: (form: SubcategoryForm) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
}

/** NOTA: no usa el Modal compartido — igual que el de categorías, no cierra al hacer click en el backdrop. */
export const SubcategoryModal = ({ show, isEditing, parentCategory, form, onChange, onSubmit, onCancel }: SubcategoryModalProps) => {
    if (!show) return null;

    return (
        <div className="modal-backdrop" style={{ zIndex: 60 }}>
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <h2 style={{ marginBottom: '0.35rem', fontSize: '1.25rem' }}>{isEditing ? 'Editar Subcategoría' : 'Nueva Subcategoría'}</h2>
                {parentCategory && (
                    <p style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Categoría principal: <strong style={{ color: 'var(--text-primary)' }}>{parentCategory.name}</strong>
                    </p>
                )}
                <form onSubmit={onSubmit}>
                    <div className="form-group">
                        <label className="form-label">Nombre de Subcategoría *</label>
                        <input type="text" className="form-input" value={form.nombre} onChange={e => onChange({ ...form, nombre: e.target.value })} required autoFocus />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descripción</label>
                        <textarea className="form-input" value={form.descripcion} onChange={e => onChange({ ...form, descripcion: e.target.value })} rows={3}></textarea>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn" onClick={onCancel}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">{isEditing ? 'Actualizar Subcategoría' : 'Crear Subcategoría'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
