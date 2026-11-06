import { CrudSection } from './CrudSection';
import type { CrudConfig } from './CrudSection';
import type { Lookups } from './useLookups';
import { fmtDate, money, num, todayISO } from './utils';
import type { Row } from './utils';
import { IconSliders, IconTrend, IconCalendar } from './icons';
import { ActivoBadge, Badge } from './ui';

const pct = (v: unknown, digits = 2) => `${num(Number(v || 0) * 100, digits)} %`;
const toPct = (v: unknown) => (v == null || v === '' ? '' : String(Math.round(Number(v) * 10000) / 100));
const fromPct = (v: unknown) => Math.round(Number(v) * 100) / 10000;

const activoFilter = [{ value: 'true', label: 'Activos' }, { value: 'false', label: 'Inactivos' }];

// ─── INSS ───────────────────────────────────────────────────────────────
const inssConfig: CrudConfig = {
    endpoint: '/configuracion-inss',
    singular: 'Configuración INSS',
    newLabel: 'Nueva Tasa INSS',
    icon: <IconSliders />,
    modalWidth: '560px',
    searchPlaceholder: 'Buscar por observaciones...',
    deleteTitle: '¿Desactivar tasa INSS?',
    deleteText: 'La tasa dejará de usarse en nuevos cálculos de planilla.',
    deleteLabel: 'Desactivar',
    canDelete: (r) => r.activo !== false,
    searchText: (r) => `${r.observaciones || ''} ${fmtDate(r.fechavigencia)}`,
    filters: [{ key: 'activo', label: 'Todas', options: activoFilter }],
    fields: [
        { key: 'tasalaboral', label: 'Tasa laboral (%)', type: 'number', required: true, min: 0, max: 100, step: '0.01', help: 'Descuento al empleado. Ej. 7' },
        { key: 'tasapatronal', label: 'Tasa patronal (%)', type: 'number', required: true, min: 0, max: 100, step: '0.01', help: 'Aporte de la empresa. Ej. 21.5' },
        { key: 'fechavigencia', label: 'Vigente desde', type: 'date', required: true, defaultValue: todayISO() },
        { key: 'fechafinvigencia', label: 'Vigente hasta', type: 'date' },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea', full: true },
        { key: 'activo', label: 'Tasa activa', type: 'checkbox', defaultValue: true, hideOnCreate: true },
    ],
    toForm: (r) => ({ tasalaboral: toPct(r.tasalaboral), tasapatronal: toPct(r.tasapatronal) }),
    toPayload: (payload) => ({ ...payload, tasalaboral: fromPct(payload.tasalaboral), tasapatronal: fromPct(payload.tasapatronal) }),
    columns: [
        { header: 'Vigencia', strong: true, render: (r) => `${fmtDate(r.fechavigencia)} — ${r.fechafinvigencia ? fmtDate(r.fechafinvigencia) : 'sin fin'}` },
        { header: 'Tasa laboral', align: 'right', render: (r) => <span className="tabular" style={{ fontWeight: 600 }}>{pct(r.tasalaboral)}</span> },
        { header: 'Tasa patronal', align: 'right', render: (r) => <span className="tabular" style={{ fontWeight: 600 }}>{pct(r.tasapatronal)}</span> },
        { header: 'Observaciones', muted: true, render: (r) => r.observaciones || '—' },
        { header: 'Estado', render: (r) => <ActivoBadge activo={r.activo !== false} /> },
    ],
};

// ─── Tramos de IR ───────────────────────────────────────────────────────
const irConfig: CrudConfig = {
    endpoint: '/tabla-tramo-ir',
    singular: 'Tramo de IR',
    newLabel: 'Nuevo Tramo',
    icon: <IconTrend />,
    modalWidth: '560px',
    searchPlaceholder: 'Buscar tramo...',
    deleteTitle: '¿Desactivar tramo?',
    deleteText: 'El tramo dejará de usarse en nuevos cálculos de planilla.',
    deleteLabel: 'Desactivar',
    canDelete: (r) => r.activo !== false,
    searchText: (r) => `${r.salariodesde} ${r.salariohasta ?? ''} ${fmtDate(r.fechavigencia)}`,
    filters: [{ key: 'activo', label: 'Todos', options: activoFilter }],
    fields: [
        { key: 'salariodesde', label: 'Renta neta anual desde (C$)', type: 'number', required: true, min: 0 },
        { key: 'salariohasta', label: 'Renta neta anual hasta (C$)', type: 'number', min: 0, help: 'Vacío para el último tramo (sin límite).' },
        { key: 'cuotafija', label: 'Cuota fija (C$)', type: 'number', min: 0, defaultValue: '0' },
        { key: 'tasamarginal', label: 'Tasa sobre el exceso (%)', type: 'number', required: true, min: 0, max: 100, step: '0.01', defaultValue: '0' },
        { key: 'fechavigencia', label: 'Vigente desde', type: 'date', required: true, defaultValue: todayISO() },
        { key: 'activo', label: 'Tramo activo', type: 'checkbox', defaultValue: true, hideOnCreate: true },
    ],
    toForm: (r) => ({ tasamarginal: toPct(r.tasamarginal) }),
    toPayload: (payload) => ({ ...payload, tasamarginal: fromPct(payload.tasamarginal) }),
    columns: [
        { header: 'Desde', align: 'right', render: (r) => <span className="tabular">{money(r.salariodesde)}</span> },
        { header: 'Hasta', align: 'right', render: (r) => <span className="tabular">{r.salariohasta != null ? money(r.salariohasta) : 'En adelante'}</span> },
        { header: 'Cuota fija', align: 'right', render: (r) => <span className="tabular">{money(r.cuotafija)}</span> },
        { header: 'Tasa', align: 'right', render: (r) => <span className="tabular" style={{ fontWeight: 600 }}>{pct(r.tasamarginal)}</span> },
        { header: 'Vigencia', muted: true, render: (r) => fmtDate(r.fechavigencia) },
        { header: 'Estado', render: (r) => <ActivoBadge activo={r.activo !== false} /> },
    ],
};

// ─── Feriados nacionales ────────────────────────────────────────────────
const currentYear = new Date().getFullYear();
const anios = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => ({ value: String(y), label: String(y) }));

const feriadosConfig: CrudConfig = {
    endpoint: '/feriados-nacionales',
    singular: 'Feriado',
    newLabel: 'Nuevo Feriado',
    icon: <IconCalendar />,
    modalWidth: '480px',
    searchPlaceholder: 'Buscar feriado...',
    deleteTitle: '¿Desactivar feriado?',
    deleteLabel: 'Desactivar',
    canDelete: (r) => r.activo !== false,
    searchText: (r) => r.nombre,
    filters: [{ key: 'anio', label: 'Todos los años', options: anios }],
    fields: [
        { key: 'nombre', label: 'Nombre', required: true, full: true },
        { key: 'fecha', label: 'Fecha', type: 'date', required: true, defaultValue: todayISO() },
        { key: 'esrecurrente', label: 'Se repite cada año', type: 'checkbox', defaultValue: true },
        { key: 'activo', label: 'Feriado activo', type: 'checkbox', defaultValue: true, hideOnCreate: true },
    ],
    columns: [
        { header: 'Fecha', muted: true, render: (r) => fmtDate(r.fecha) },
        { header: 'Feriado', strong: true, render: (r: Row) => r.nombre },
        { header: 'Recurrencia', render: (r) => <Badge tone={r.esrecurrente ? 'primary' : 'neutral'}>{r.esrecurrente ? 'Anual' : 'Única vez'}</Badge> },
        { header: 'Estado', render: (r) => <ActivoBadge activo={r.activo !== false} /> },
    ],
};

export type ParametrosView = 'inss' | 'ir' | 'feriados';

const CONFIGS: Record<ParametrosView, CrudConfig> = {
    inss: inssConfig,
    ir: irConfig,
    feriados: feriadosConfig,
};

export const ParametrosSection = ({ lookups, view }: { lookups: Lookups; view: ParametrosView }) => (
    <CrudSection key={view} config={CONFIGS[view]} lookups={lookups} />
);
