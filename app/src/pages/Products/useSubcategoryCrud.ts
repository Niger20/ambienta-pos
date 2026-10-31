import { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api/axios';
import type { Category, Subcategory } from './types';

const emptyForm = { nombre: '', descripcion: '' };

export function useSubcategoryCrud(
    categories: Category[],
    fetchData: () => Promise<void>,
    requestAuth: (accion: string, detalle: string, onSuccess: () => Promise<void>) => Promise<void>,
) {
    const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
    const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | null>(null);
    const [parentCategoryId, setParentCategoryId] = useState<number | null>(null);
    const [subcategoryForm, setSubcategoryForm] = useState(emptyForm);

    const isEditingSubcategory = editingSubcategoryId !== null;
    const parentCategory = categories.find(c => c.id === parentCategoryId) || null;

    const openCreateSubcategoryModal = (categoriaid: number) => {
        setEditingSubcategoryId(null);
        setParentCategoryId(categoriaid);
        setSubcategoryForm(emptyForm);
        setIsSubcategoryModalOpen(true);
    };

    const editSubcategory = (sub: Subcategory) => {
        setEditingSubcategoryId(sub.id);
        setParentCategoryId(sub.categoriaid);
        setSubcategoryForm({ nombre: sub.name || '', descripcion: sub.description || '' });
        setIsSubcategoryModalOpen(true);
    };

    const deleteSubcategory = async (sub: Subcategory) => {
        const result = await Swal.fire({
            title: '¿Eliminar subcategoría?',
            text: `Se eliminará "${sub.name}". Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;

        await requestAuth('ELIMINAR_SUBCATEGORIA', `Eliminar subcategoría #${sub.id} (${sub.name})`, async () => {
            try {
                await api.delete(`/subcategoria-productos/${sub.id}`);
                Swal.fire({ icon: 'success', title: 'Subcategoría eliminada', timer: 1500, showConfirmButton: false });
                fetchData();
            } catch (err: any) {
                Swal.fire('Error', err.response?.data?.error || 'No se pudo eliminar la subcategoría.', 'error');
            }
        });
    };

    const handleSaveSubcategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (parentCategoryId == null) return;

        const doSave = async () => {
            try {
                const payload = {
                    categoriaid: parentCategoryId,
                    nombre: subcategoryForm.nombre.trim(),
                    descripcion: subcategoryForm.descripcion.trim() || null,
                };
                if (editingSubcategoryId !== null) {
                    await api.put(`/subcategoria-productos/${editingSubcategoryId}`, payload);
                } else {
                    await api.post('/subcategoria-productos', payload);
                }
                setIsSubcategoryModalOpen(false);
                Swal.fire({
                    icon: 'success',
                    title: editingSubcategoryId !== null ? 'Subcategoría actualizada' : 'Subcategoría creada',
                    timer: 1500,
                    showConfirmButton: false,
                });
                fetchData();
            } catch (err: any) {
                Swal.fire('Error', err.response?.data?.error || 'No se pudo guardar la subcategoría.', 'error');
            }
        };

        if (editingSubcategoryId !== null) {
            await requestAuth('EDITAR_SUBCATEGORIA', `Editar subcategoría #${editingSubcategoryId}`, doSave);
        } else {
            await doSave();
        }
    };

    return {
        isSubcategoryModalOpen, setIsSubcategoryModalOpen,
        isEditingSubcategory, parentCategory,
        subcategoryForm, setSubcategoryForm,
        openCreateSubcategoryModal, editSubcategory, deleteSubcategory, handleSaveSubcategory,
    };
}
