import { CrudSection } from './CrudSection';
import type { CrudConfig } from './CrudSection';
import type { Lookups } from './useLookups';
import { GenerarAcumulados } from './GenerarAcumulados';
import { empleadoNombre, fmtDate, labelize, money, optsFrom, periodoLabel, round2, todayISO } from './utils';
import type { Row } from './utils';
import { IconAward, IconCoins, IconLogOut } from './icons';
import { Badge } from './ui';

const empleadoOpts = (lk: Lookups) => lk.empleados.filter(e => e.estado !== false).map(e => ({ value: e.id, label: empleadoNombre(e) }));
const periodoOpts = (lk: Lookups) => lk.periodos.map(p => ({ value: p.id, label: periodoLabel(p) }));
const nombreDe = (r: Row, lk: Lookups) => r.empleadonombre || empleadoNombre(lk.empleados.find(e => e.id === r.empleadoid));

const baseFilters = [
    { key: 'empleadoid', label: 'Todos los empleados', options: (lk: Lookups) => lk.empleados.map(e => ({ value: e.id, label: empleadoNombre(e) })) },
    { key: 'periodoid', label: 'Todos los períodos', options: periodoOpts },
];

/** Antigüedad en años completos al cierre del período. */
const aniosAntiguedad = (emp: Row, periodo: Row): number => {
    const ingreso = new Date(`${String(emp.fechaingreso).slice(0, 10)}T00:00:00Z`).getTime();
    const fin = new Date(`${String(periodo.fechafin).slice(0, 10)}T00:00:00Z`).getTime();
    return Math.max(0, (fin - ingreso) / (365.25 * 86400000));
};

// ─── Décimo tercer mes ──────────────────────────────────────────────────
const decimoConfig: CrudConfig = {
    endpoint: '/acumulado-decimo-primer-mes',
    singular: 'Acumulado de décimo tercer mes',
    newLabel: 'Nuevo Acumulado',
    icon: <IconAward />,
    modalWidth: '600px',
    searchPlaceholder: 'Buscar por empleado...',
    searchText: (r, lk) => nombreDe(r, lk),
    filters: baseFilters,
    fields: [
        { key: 'empleadoid', label: 'Empleado', type: 'select', numeric: true, required: true, options: empleadoOpts, disabledOnEdit: true },
        { key: 'periodoid', label: 'Período', type: 'select', numeric: true, required: true, options: periodoOpts, disabledOnEdit: true },
        { key: 'salariobruto', label: 'Salario bruto del período (C$)', type: 'number', min: 0, help: 'Si se deja vacío se toma el salario base del empleado.' },
        { key: 'montoacumulado', label: 'Monto acumulado (C$)', type: 'number', min: 0, help: 'Si se deja vacío: salario bruto / 12.' },
        { key: 'montopagado', label: 'Monto pagado (C$)', type: 'number', min: 0, defaultValue: '0' },
        { key: 'fechageneracion', label: 'Fecha de generación', type: 'date', defaultValue: todayISO() },
    ],
    toPayload: (payload, { mode, lookups }) => {
        const out = { ...payload };
        if (mode === 'edit') { delete out.empleadoid; delete out.periodoid; return out; }
        const emp = lookups.empleados.find(e => e.id === out.empleadoid);
        const salario = Number(emp?.salariobase || 0);
        if (out.salariobruto == null) out.salariobruto = salario;
        if (out.montoacumulado == null) out.montoacumulado = round2(Number(out.salariobruto) / 12);
        return out;
    },
    columns: [
        { header: 'Período', muted: true, render: (r, lk) => periodoLabel(lk.periodos.find(p => p.id === r.periodoid)) },
        { header: 'Empleado', strong: true, render: (r, lk) => nombreDe(r, lk) },
        { header: 'Salario bruto', align: 'right', render: (r) => <span className="tabular">{money(r.salariobruto)}</span> },
        { header: 'Acumulado', align: 'right', render: (r) => <span className="tabular" style={{ fontWeight: 600 }}>{money(r.montoacumulado)}</span> },
        { header: 'Pagado', align: 'right', render: (r) => <span className="tabular" style={{ color: 'var(--accent-success)' }}>{money(r.montopagado)}</span> },
        { header: 'Saldo', align: 'right', render: (r) => <span className="tabular">{money(Number(r.montoacumulado) - Number(r.montopagado))}</span> },
    ],
    summary: (rows) => {
        const acumulado = rows.reduce((s, r) => s + Number(r.montoacumulado || 0), 0);
        const pagado = rows.reduce((s, r) => s + Number(r.montopagado || 0), 0);
        return [
            { label: 'Total acumulado', value: money(acumulado), tone: 'primary' },
            { label: 'Total pagado', value: money(pagado), tone: 'success' },
            { label: 'Saldo por pagar', value: money(acumulado - pagado), tone: 'danger' },
        ];
    },
    toolbarExtra: (ctx) => (
        <GenerarAcumulados
            endpoint="/acumulado-decimo-primer-mes"
            title="Generar acumulado de décimo tercer mes"
            ctx={ctx}
            buildPayload={(emp) => ({ salariobruto: Number(emp.salariobase), montoacumulado: round2(Number(emp.salariobase) / 12), montopagado: 0 })}
        />
    ),
};

// ─── Indemnización ──────────────────────────────────────────────────────
const indemnizacionConfig: CrudConfig = {
    endpoint: '/acumulado-indemnizacion',
    singular: 'Acumulado de indemnización',
    newLabel: 'Nuevo Acumulado',
    icon: <IconCoins />,
    modalWidth: '600px',
    searchPlaceholder: 'Buscar por empleado...',
    searchText: (r, lk) => nombreDe(r, lk),
    filters: baseFilters,
    fields: [
        { key: 'empleadoid', label: 'Empleado', type: 'select', numeric: true, required: true, options: empleadoOpts, disabledOnEdit: true },
        { key: 'periodoid', label: 'Período', type: 'select', numeric: true, required: true, options: periodoOpts, disabledOnEdit: true },
        { key: 'salariobruto', label: 'Salario bruto del período (C$)', type: 'number', min: 0, help: 'Si se deja vacío se toma el salario base del empleado.' },
        { key: 'montoacumulado', label: 'Monto acumulado (C$)', type: 'number', min: 0, help: 'Si se deja vacío: un mes de salario por año (primeros 3 años) y 20 días después.' },
        { key: 'fechageneracion', label: 'Fecha de generación', type: 'date', defaultValue: todayISO() },
    ],
    toPayload: (payload, { mode, lookups }) => {
        const out = { ...payload };
        if (mode === 'edit') { delete out.empleadoid; delete out.periodoid; return out; }
        const emp = lookups.empleados.find(e => e.id === out.empleadoid);
        const periodo = lookups.periodos.find(p => p.id === out.periodoid);
        const salario = Number(emp?.salariobase || 0);
        if (out.salariobruto == null) out.salariobruto = salario;
        if (out.montoacumulado == null) {
            const mensual = emp && periodo && aniosAntiguedad(emp, periodo) >= 3 ? (Number(out.salariobruto) * (20 / 30)) / 12 : Number(out.salariobruto) / 12;
            out.montoacumulado = round2(mensual);
        }
        return out;
    },
    columns: [
        { header: 'Período', muted: true, render: (r, lk) => periodoLabel(lk.periodos.find(p => p.id === r.periodoid)) },
        { header: 'Empleado', strong: true, render: (r, lk) => nombreDe(r, lk) },
        { header: 'Salario bruto', align: 'right', render: (r) => <span className="tabular">{money(r.salariobruto)}</span> },
        { header: 'Acumulado', align: 'right', render: (r) => <span className="tabular" style={{ fontWeight: 600 }}>{money(r.montoacumulado)}</span> },
        { header: 'Generado', muted: true, render: (r) => fmtDate(r.fechageneracion) },
    ],
    summary: (rows) => [
        { label: 'Registros', value: rows.length, tone: 'primary' },
        { label: 'Total acumulado', value: money(rows.reduce((s, r) => s + Number(r.montoacumulado || 0), 0)), tone: 'success' },
    ],
    toolbarExtra: (ctx) => (
        <GenerarAcumulados
            endpoint="/acumulado-indemnizacion"
            title="Generar acumulado de indemnización"
            ctx={ctx}
            buildPayload={(emp, periodo) => {
                const salario = Number(emp.salariobase);
                const mensual = aniosAntiguedad(emp, periodo) < 3 ? salario / 12 : (salario * (20 / 30)) / 12;
                return { salariobruto: salario, montoacumulado: round2(mensual) };
            }}
        />
    ),
};

// ─── Pagos de beneficios ────────────────────────────────────────────────
const TIPOS_BENEFICIO = ['DECIMO_TERCER_MES', 'VACACIONES', 'INDEMNIZACION'];

const pagosConfig: CrudConfig = {
    endpoint: '/pagos-beneficios',
    singular: 'Pago de beneficio',
    newLabel: 'Registrar Pago',
    icon: <IconLogOut />,
    modalWidth: '600px',
    searchPlaceholder: 'Buscar por empleado...',
    deleteTitle: '¿Eliminar pago de beneficio?',
    searchText: (r, lk) => nombreDe(r, lk),
    filters: [
        { key: 'empleadoid', label: 'Todos los empleados', options: (lk) => lk.empleados.map(e => ({ value: e.id, label: empleadoNombre(e) })) },
        { key: 'tipobeneficio', label: 'Todos los tipos', options: optsFrom(TIPOS_BENEFICIO) },
    ],
    fields: [
        { key: 'empleadoid', label: 'Empleado', type: 'select', numeric: true, required: true, options: empleadoOpts, disabledOnEdit: true, full: true },
        { key: 'tipobeneficio', label: 'Tipo de beneficio', type: 'select', required: true, options: optsFrom(TIPOS_BENEFICIO) },
        { key: 'montopagado', label: 'Monto pagado (C$)', type: 'number', required: true, min: 0 },
        { key: 'fechapago', label: 'Fecha de pago', type: 'date', required: true, defaultValue: todayISO() },
        { key: 'periodoid', label: 'Período (opcional)', type: 'select', numeric: true, options: periodoOpts },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea', full: true },
    ],
    toPayload: (payload, { mode, userId }) => (mode === 'create' && userId != null ? { ...payload, usuarioid: userId } : payload),
    columns: [
        { header: 'Fecha', muted: true, render: (r) => fmtDate(r.fechapago) },
        { header: 'Empleado', strong: true, render: (r, lk) => nombreDe(r, lk) },
        { header: 'Beneficio', render: (r) => <Badge tone="primary">{labelize(r.tipobeneficio)}</Badge> },
        { header: 'Monto', align: 'right', render: (r) => <span className="tabular" style={{ fontWeight: 600, color: 'var(--accent-success)' }}>{money(r.montopagado)}</span> },
        { header: 'Período', muted: true, render: (r, lk) => r.periodoid ? periodoLabel(lk.periodos.find(p => p.id === r.periodoid)) : '—' },
        { header: 'Observaciones', muted: true, render: (r) => r.observaciones || '—' },
    ],
    summary: (rows) => TIPOS_BENEFICIO.map(t => ({
        label: labelize(t),
        value: money(rows.filter(r => r.tipobeneficio === t).reduce((s, r) => s + Number(r.montopagado || 0), 0)),
        tone: 'default' as const,
    })),
};

export type BeneficiosView = 'decimo' | 'indemnizacion' | 'pagos';

const CONFIGS: Record<BeneficiosView, CrudConfig> = {
    decimo: decimoConfig,
    indemnizacion: indemnizacionConfig,
    pagos: pagosConfig,
};

export const BeneficiosSection = ({ lookups, view }: { lookups: Lookups; view: BeneficiosView }) => (
    <CrudSection key={view} config={CONFIGS[view]} lookups={lookups} />
);
