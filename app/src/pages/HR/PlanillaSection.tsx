import { useState } from 'react';
import { CrudSection } from './CrudSection';
import type { CrudConfig } from './CrudSection';
import type { Lookups } from './useLookups';
import { PeriodoDetalle } from './PeriodoDetalle';
import { fmtDate, optsFrom, periodoLabel, todayISO } from './utils';
import { IconList, IconWallet } from './icons';
import { ActionButton, EstadoBadge } from './ui';

const ESTADOS = ['ABIERTO', 'EN_REVISION', 'APROBADO', 'PAGADO', 'CERRADO'];

export const PlanillaSection = ({ lookups }: { lookups: Lookups }) => {
    const [periodoId, setPeriodoId] = useState<number | null>(null);

    if (periodoId != null) {
        return <PeriodoDetalle periodoId={periodoId} lookups={lookups} onBack={() => setPeriodoId(null)} />;
    }

    const config: CrudConfig = {
        endpoint: '/periodos-planilla',
        singular: 'Período',
        newLabel: 'Nuevo Período',
        icon: <IconWallet />,
        modalWidth: '560px',
        searchPlaceholder: 'Buscar período u observación...',
        deleteTitle: '¿Eliminar período?',
        deleteText: 'Solo puede eliminarse un período que no tenga planilla generada.',
        canEdit: (r) => r.estado !== 'CERRADO',
        canDelete: (r) => r.estado === 'ABIERTO',
        searchText: (r) => `${periodoLabel(r)} ${r.observaciones || ''}`,
        filters: [{ key: 'estado', label: 'Todos los estados', options: optsFrom(ESTADOS) }],
        fields: [
            { key: 'tipoperiodo', label: 'Frecuencia', type: 'select', required: true, defaultValue: 'MENSUAL', options: optsFrom(['MENSUAL', 'QUINCENAL', 'SEMANAL']) },
            { key: 'estado', label: 'Estado', type: 'select', required: true, options: optsFrom(ESTADOS), hideOnCreate: true },
            { key: 'fechainicio', label: 'Inicio del período', type: 'date', required: true, defaultValue: todayISO() },
            { key: 'fechafin', label: 'Fin del período', type: 'date', required: true, defaultValue: todayISO() },
            { key: 'fechapago', label: 'Fecha de pago', type: 'date' },
            { key: 'observaciones', label: 'Observaciones', type: 'textarea', full: true },
        ],
        columns: [
            { header: 'Período', strong: true, render: (r) => periodoLabel(r) },
            { header: 'Fecha de pago', muted: true, render: (r) => fmtDate(r.fechapago) },
            { header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
            { header: 'Observaciones', muted: true, render: (r) => r.observaciones || '—' },
        ],
        rowActions: (row) => (
            <ActionButton onClick={() => setPeriodoId(row.id)} tone="primary" title="Ver y generar la planilla del período">
                <IconList />
                <span>Planilla</span>
            </ActionButton>
        ),
        summary: (rows) => [
            { label: 'Períodos', value: rows.length, tone: 'primary' },
            { label: 'En proceso', value: rows.filter(r => r.estado === 'ABIERTO' || r.estado === 'EN_REVISION').length, tone: 'default' },
            { label: 'Aprobados / pagados', value: rows.filter(r => r.estado === 'APROBADO' || r.estado === 'PAGADO').length, tone: 'success' },
        ],
    };

    return <CrudSection config={config} lookups={lookups} />;
};
