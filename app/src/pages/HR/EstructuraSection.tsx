import { CrudSection } from './CrudSection';
import type { CrudConfig } from './CrudSection';
import type { Lookups } from './useLookups';
import { money } from './utils';
import { IconBuilding, IconAward } from './icons';
import { ActivoBadge } from './ui';

const departamentosConfig: CrudConfig = {
    endpoint: '/departamentos-empleados',
    singular: 'Departamento',
    newLabel: 'Nuevo Departamento',
    icon: <IconBuilding />,
    modalWidth: '480px',
    searchPlaceholder: 'Buscar departamento...',
    deleteText: 'Solo puede eliminarse si no tiene cargos ni empleados asociados.',
    searchText: (r) => `${r.nombre} ${r.descripcion || ''}`,
    fields: [
        { key: 'nombre', label: 'Nombre', required: true, full: true },
        { key: 'descripcion', label: 'Descripción', type: 'textarea', full: true },
    ],
    columns: [
        { header: 'Departamento', strong: true, render: (r) => r.nombre },
        { header: 'Descripción', muted: true, render: (r) => r.descripcion || '—' },
        {
            header: 'Empleados', align: 'center',
            render: (r, lk) => lk.empleados.filter(e => e.departamentoid === r.id).length,
        },
        {
            header: 'Cargos', align: 'center',
            render: (r, lk) => lk.cargos.filter(c => c.departamentoid === r.id).length,
        },
    ],
};

const cargosConfig: CrudConfig = {
    endpoint: '/cargos-empleados',
    singular: 'Cargo',
    newLabel: 'Nuevo Cargo',
    icon: <IconAward />,
    modalWidth: '560px',
    searchPlaceholder: 'Buscar cargo o departamento...',
    deleteTitle: '¿Desactivar cargo?',
    deleteText: 'El cargo dejará de ofrecerse al registrar empleados. Los empleados actuales conservan su cargo.',
    deleteLabel: 'Desactivar',
    canDelete: (r) => r.estado !== false,
    searchText: (r) => `${r.nombre} ${r.departamentonombre || ''}`,
    filters: [
        {
            key: 'departamentoid', label: 'Todos los departamentos',
            options: (lk) => lk.departamentos.map(d => ({ value: d.id, label: d.nombre })),
        },
    ],
    fields: [
        { key: 'nombre', label: 'Nombre del cargo', required: true, full: true },
        { key: 'departamentoid', label: 'Departamento', type: 'select', numeric: true, options: (lk) => lk.departamentos.map(d => ({ value: d.id, label: d.nombre })) },
        { key: 'salariominimoreferencial', label: 'Salario mínimo referencial (C$)', type: 'number', min: 0 },
        { key: 'salariomaximoreferencial', label: 'Salario máximo referencial (C$)', type: 'number', min: 0 },
        { key: 'descripcion', label: 'Descripción', type: 'textarea', full: true },
        { key: 'estado', label: 'Cargo activo', type: 'checkbox', defaultValue: true, hideOnCreate: true },
    ],
    columns: [
        { header: 'Cargo', strong: true, render: (r) => r.nombre },
        { header: 'Departamento', muted: true, render: (r) => r.departamentonombre || '—' },
        {
            header: 'Rango salarial', align: 'right',
            render: (r) => (r.salariominimoreferencial != null || r.salariomaximoreferencial != null)
                ? <span className="tabular">{money(r.salariominimoreferencial)} – {money(r.salariomaximoreferencial)}</span>
                : '—',
        },
        {
            header: 'Empleados', align: 'center',
            render: (r, lk) => lk.empleados.filter(e => e.cargoid === r.id).length,
        },
        { header: 'Estado', render: (r) => <ActivoBadge activo={r.estado !== false} /> },
    ],
};

export type EstructuraView = 'departamentos' | 'cargos';

const CONFIGS: Record<EstructuraView, CrudConfig> = {
    departamentos: departamentosConfig,
    cargos: cargosConfig,
};

export const EstructuraSection = ({ lookups, view }: { lookups: Lookups; view: EstructuraView }) => (
    <CrudSection key={view} config={CONFIGS[view]} lookups={lookups} />
);
