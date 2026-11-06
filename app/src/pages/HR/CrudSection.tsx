import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import Swal from 'sweetalert2';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { getArrayData } from '../../utils/arrayUtils';
import type { Lookups } from './useLookups';
import { apiError, toInputDate, toInputTime } from './utils';
import type { Row, Opt } from './utils';
import { IconPlus } from './icons';
import {
    SearchBox, StatusToggle, SummaryCards, DataTable, Td, RowActions, EditButton, DeleteButton,
    FormModal, FormGrid, SectionToolbar, PrimaryButton, FilterSelect,
} from './ui';
import type { SummaryItem } from './ui';

export interface FieldDef {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'date' | 'time' | 'select' | 'checkbox' | 'textarea' | 'email';
    required?: boolean;
    step?: string;
    min?: number;
    max?: number;
    /** Opciones fijas o derivadas de los catálogos. */
    options?: Opt[] | ((lk: Lookups) => Opt[]);
    /** Para selects cuyo valor es un ID numérico. */
    numeric?: boolean;
    defaultValue?: string | boolean;
    /** Ocupa todo el ancho del formulario. */
    full?: boolean;
    hideOnEdit?: boolean;
    hideOnCreate?: boolean;
    disabledOnEdit?: boolean;
    placeholder?: string;
    help?: string;
}

export interface CrudColumn {
    header: string;
    align?: 'left' | 'right' | 'center';
    strong?: boolean;
    muted?: boolean;
    render: (row: Row, lk: Lookups) => ReactNode;
}

export interface CrudFilter {
    key: string;
    label: string;
    /** `select` (por defecto) o `date` para rangos de fecha enviados como parámetro de consulta. */
    type?: 'select' | 'date';
    options?: Opt[] | ((lk: Lookups) => Opt[]);
}

export interface CrudContext {
    reload: () => Promise<void>;
    reloadLookups: () => Promise<void>;
    lookups: Lookups;
    openEdit: (row: Row) => void;
    isInactive: boolean;
    userId: number | null;
}

export interface CrudConfig {
    endpoint: string;
    idKey?: string;
    singular: string;
    newLabel: string;
    icon?: ReactNode;
    fields: FieldDef[];
    columns: CrudColumn[];
    filters?: CrudFilter[];
    searchText: (row: Row, lk: Lookups) => string;
    searchPlaceholder?: string;
    modalWidth?: string;
    /** Activa el interruptor Activos / Inactivos usando este endpoint para los inactivos. */
    deactivatedEndpoint?: string;
    deleteTitle?: string;
    deleteText?: string;
    deleteLabel?: string;
    allowCreate?: boolean;
    canEdit?: (row: Row) => boolean;
    canDelete?: (row: Row) => boolean;
    toForm?: (row: Row) => Record<string, any>;
    toPayload?: (payload: Row, ctx: { mode: 'create' | 'edit'; form: Record<string, any>; row: Row | null; userId: number | null; lookups: Lookups }) => Row | Promise<Row>;
    rowActions?: (row: Row, ctx: CrudContext) => ReactNode;
    toolbarExtra?: (ctx: CrudContext) => ReactNode;
    summary?: (rows: Row[], lk: Lookups) => SummaryItem[];
    emptyText?: string;
    /** Parámetros fijos agregados a la consulta de listado. */
    baseQuery?: string;
}

const fieldInitial = (f: FieldDef, row: Row | null): any => {
    if (row) {
        const v = row[f.key];
        if (f.type === 'checkbox') return Boolean(v);
        if (f.type === 'date') return toInputDate(v);
        if (f.type === 'time') return toInputTime(v);
        return v == null ? '' : String(v);
    }
    if (f.defaultValue !== undefined) return f.defaultValue;
    return f.type === 'checkbox' ? false : '';
};

export const CrudSection = ({ config, lookups }: { config: CrudConfig; lookups: Lookups }) => {
    const { user } = useAuth();
    const userId = user?.id != null && !Number.isNaN(Number(user.id)) ? Number(user.id) : null;
    const idKey = config.idKey || 'id';

    const [rows, setRows] = useState<Row[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterValues, setFilterValues] = useState<Record<string, string>>({});
    const [showInactive, setShowInactive] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [editingRow, setEditingRow] = useState<Row | null>(null);
    const [form, setForm] = useState<Record<string, any>>({});

    const query = useMemo(() => {
        if (showInactive && config.deactivatedEndpoint) return config.deactivatedEndpoint;
        const params = new URLSearchParams(config.baseQuery || '');
        params.set('limit', '0');
        Object.entries(filterValues).forEach(([k, v]) => { if (v) params.set(k, v); });
        return `${config.endpoint}?${params.toString()}`;
    }, [config, filterValues, showInactive]);

    const fetchRows = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get(query);
            setRows(getArrayData(res.data));
        } catch (error) {
            console.error(error);
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    }, [query]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const visibleFields = config.fields.filter(f => (editingRow ? !f.hideOnEdit : !f.hideOnCreate));

    const openCreate = () => {
        const initial: Record<string, any> = {};
        config.fields.forEach(f => { initial[f.key] = fieldInitial(f, null); });
        setEditingRow(null);
        setForm(initial);
        setShowModal(true);
    };

    const openEdit = (row: Row) => {
        const initial: Record<string, any> = {};
        config.fields.forEach(f => { initial[f.key] = fieldInitial(f, row); });
        setEditingRow(row);
        setForm(config.toForm ? { ...initial, ...config.toForm(row) } : initial);
        setShowModal(true);
    };

    const buildPayload = async (): Promise<Row> => {
        const payload: Row = {};
        visibleFields.forEach(f => {
            const v = form[f.key];
            if (f.type === 'checkbox') { payload[f.key] = Boolean(v); return; }
            if (v === '' || v == null) return;
            if (f.type === 'number' || (f.type === 'select' && f.numeric)) payload[f.key] = Number(v);
            else payload[f.key] = typeof v === 'string' ? v.trim() : v;
        });
        const ctx = { mode: (editingRow ? 'edit' : 'create') as 'create' | 'edit', form, row: editingRow, userId, lookups };
        return config.toPayload ? config.toPayload(payload, ctx) : payload;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = await buildPayload();
            if (editingRow) {
                await api.put(`${config.endpoint}/${editingRow[idKey]}`, payload);
                Swal.fire({ icon: 'success', title: `${config.singular} actualizado`, timer: 1500, showConfirmButton: false });
            } else {
                await api.post(config.endpoint, payload);
                Swal.fire({ icon: 'success', title: `${config.singular} creado`, timer: 1500, showConfirmButton: false });
            }
            setShowModal(false);
            await fetchRows();
            if (lookups.reload) lookups.reload();
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'Error al guardar.'), 'error');
        }
    };

    const handleDelete = async (row: Row) => {
        const result = await Swal.fire({
            title: config.deleteTitle || `¿Eliminar ${config.singular.toLowerCase()}?`,
            text: config.deleteText || 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: config.deleteLabel || 'Eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await api.delete(`${config.endpoint}/${row[idKey]}`);
            Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
            await fetchRows();
            if (lookups.reload) lookups.reload();
        } catch (err: any) {
            Swal.fire('Error', apiError(err, 'No se pudo eliminar.'), 'error');
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(r => config.searchText(r, lookups).toLowerCase().includes(q));
    }, [rows, search, config, lookups]);

    const ctx: CrudContext = {
        reload: fetchRows,
        reloadLookups: lookups.reload,
        lookups,
        openEdit,
        isInactive: showInactive,
        userId,
    };

    const resolveOptions = (o: Opt[] | ((lk: Lookups) => Opt[]) | undefined): Opt[] => (typeof o === 'function' ? o(lookups) : o || []);

    const hasActions = true;
    const columns = [
        ...config.columns.map(c => ({ header: c.header, align: c.align })),
        ...(hasActions ? [{ header: 'Acciones', align: 'right' as const }] : []),
    ];

    const summaryItems = config.summary ? config.summary(rows, lookups) : [];

    const renderField = (f: FieldDef) => {
        const value = form[f.key];
        const set = (v: any) => setForm(prev => ({ ...prev, [f.key]: v }));
        const disabled = Boolean(editingRow && f.disabledOnEdit);
        const label = `${f.label}${f.required ? ' *' : ''}`;
        const wrapperStyle = f.full ? { gridColumn: '1 / -1' } : undefined;

        if (f.type === 'checkbox') {
            return (
                <div className="form-group" key={f.key} style={{ ...wrapperStyle, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <input id={`hr-${f.key}`} type="checkbox" checked={Boolean(value)} onChange={(e) => set(e.target.checked)} disabled={disabled} />
                    <label htmlFor={`hr-${f.key}`} className="form-label" style={{ margin: 0 }}>{f.label}</label>
                </div>
            );
        }

        return (
            <div className="form-group" key={f.key} style={wrapperStyle}>
                <label className="form-label">{label}</label>
                {f.type === 'select' ? (
                    <select className="form-input" value={value} onChange={(e) => set(e.target.value)} required={f.required} disabled={disabled}>
                        <option value="">{f.required ? 'Seleccione...' : 'Sin especificar'}</option>
                        {resolveOptions(f.options).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                ) : f.type === 'textarea' ? (
                    <textarea className="form-input" rows={3} value={value} onChange={(e) => set(e.target.value)} required={f.required} disabled={disabled} placeholder={f.placeholder} style={{ resize: 'vertical' }} />
                ) : (
                    <input
                        type={f.type || 'text'}
                        className={`form-input${f.type === 'number' ? ' tabular' : ''}`}
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        required={f.required}
                        disabled={disabled}
                        placeholder={f.placeholder}
                        step={f.type === 'number' ? (f.step || 'any') : undefined}
                        min={f.min}
                        max={f.max}
                    />
                )}
                {f.help && <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.3rem' }}>{f.help}</div>}
            </div>
        );
    };

    return (
        <>
            <SummaryCards items={summaryItems} />

            <SectionToolbar
                left={
                    <>
                        <SearchBox value={search} onChange={setSearch} placeholder={config.searchPlaceholder} />
                        {config.filters?.map(fl => fl.type === 'date' ? (
                            <div key={fl.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{fl.label}</span>
                                <input
                                    type="date"
                                    className="form-input"
                                    style={{ height: '36px', padding: '0 12px', width: 'auto' }}
                                    value={filterValues[fl.key] || ''}
                                    onChange={(e) => setFilterValues(prev => ({ ...prev, [fl.key]: e.target.value }))}
                                />
                            </div>
                        ) : (
                            <FilterSelect
                                key={fl.key}
                                value={filterValues[fl.key] || ''}
                                onChange={(v) => setFilterValues(prev => ({ ...prev, [fl.key]: v }))}
                                options={resolveOptions(fl.options)}
                                allLabel={fl.label}
                            />
                        ))}
                    </>
                }
                right={
                    <>
                        {config.toolbarExtra?.(ctx)}
                        {config.deactivatedEndpoint && (
                            <StatusToggle active={!showInactive} onToggle={() => setShowInactive(prev => !prev)} />
                        )}
                        {config.allowCreate !== false && (
                            <PrimaryButton onClick={openCreate}>
                                <IconPlus />
                                <span>{config.newLabel}</span>
                            </PrimaryButton>
                        )}
                    </>
                }
            />

            {isLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando datos...</div>
            ) : (
                <DataTable columns={columns} isEmpty={filtered.length === 0} emptyText={config.emptyText || 'No hay registros encontrados.'}>
                    {filtered.map(row => {
                        const canEdit = config.canEdit ? config.canEdit(row) : true;
                        const canDelete = !showInactive && (config.canDelete ? config.canDelete(row) : true);
                        return (
                            <tr key={row[idKey]} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {config.columns.map((c, i) => (
                                    <Td key={`${c.header}-${i}`} align={c.align} strong={c.strong} muted={c.muted}>{c.render(row, lookups)}</Td>
                                ))}
                                <Td align="right">
                                    <RowActions>
                                        {config.rowActions?.(row, ctx)}
                                        {canEdit && <EditButton onClick={() => openEdit(row)} />}
                                        {canDelete && <DeleteButton onClick={() => handleDelete(row)} label={config.deleteLabel || 'Eliminar'} />}
                                    </RowActions>
                                </Td>
                            </tr>
                        );
                    })}
                </DataTable>
            )}

            <FormModal
                show={showModal}
                title={editingRow ? `Editar ${config.singular}` : config.newLabel}
                icon={config.icon}
                maxWidth={config.modalWidth}
                onClose={() => setShowModal(false)}
                onSubmit={handleSubmit}
            >
                <FormGrid>{visibleFields.map(renderField)}</FormGrid>
            </FormModal>
        </>
    );
};
