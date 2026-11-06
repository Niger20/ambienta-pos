import { useState } from 'react';
import type { ReactNode } from 'react';
import './hr.css';
import { SectionNav, SectionNavToggle } from '../../components/SectionNav';
import { useLookups } from './useLookups';
import type { Lookups } from './useLookups';
import {
    IconUsers, IconBuilding, IconAward, IconClock, IconSun, IconCalendar, IconWallet, IconCoins, IconList,
    IconTrend, IconLogOut, IconSliders,
} from './icons';
import { EmpleadosSection } from './EmpleadosSection';
import { EstructuraSection } from './EstructuraSection';
import { AsistenciaSection } from './AsistenciaSection';
import { PlanillaSection } from './PlanillaSection';
import { PrestamosSection } from './PrestamosSection';
import { VacacionesSection } from './VacacionesSection';
import { BeneficiosSection } from './BeneficiosSection';
import { LiquidacionesSection } from './LiquidacionesSection';
import { ParametrosSection } from './ParametrosSection';

type ViewKey =
    | 'empleados' | 'departamentos' | 'cargos'
    | 'asistencia' | 'solicitudes' | 'acumulado'
    | 'planilla' | 'anticipos' | 'prestamos' | 'cuotas'
    | 'decimo' | 'indemnizacion' | 'pagos' | 'liquidaciones'
    | 'inss' | 'ir' | 'feriados';

interface MenuItem {
    key: ViewKey;
    label: string;
    icon: ReactNode;
    render: (lk: Lookups) => ReactNode;
}

interface MenuGroup {
    label: string;
    items: MenuItem[];
}

const MENU: MenuGroup[] = [
    {
        label: 'Personal',
        items: [
            { key: 'empleados', label: 'Empleados', icon: <IconUsers />, render: (lk) => <EmpleadosSection lookups={lk} /> },
            { key: 'departamentos', label: 'Departamentos', icon: <IconBuilding />, render: (lk) => <EstructuraSection lookups={lk} view="departamentos" /> },
            { key: 'cargos', label: 'Cargos', icon: <IconAward />, render: (lk) => <EstructuraSection lookups={lk} view="cargos" /> },
        ],
    },
    {
        label: 'Tiempo y vacaciones',
        items: [
            { key: 'asistencia', label: 'Asistencia', icon: <IconClock />, render: (lk) => <AsistenciaSection lookups={lk} /> },
            { key: 'solicitudes', label: 'Solicitudes de vacaciones', icon: <IconCalendar />, render: (lk) => <VacacionesSection lookups={lk} view="solicitudes" /> },
            { key: 'acumulado', label: 'Acumulado de vacaciones', icon: <IconSun />, render: (lk) => <VacacionesSection lookups={lk} view="acumulado" /> },
        ],
    },
    {
        label: 'Nómina',
        items: [
            { key: 'planilla', label: 'Planilla', icon: <IconWallet />, render: (lk) => <PlanillaSection lookups={lk} /> },
            { key: 'anticipos', label: 'Anticipos de salario', icon: <IconWallet />, render: (lk) => <PrestamosSection lookups={lk} view="anticipos" /> },
            { key: 'prestamos', label: 'Préstamos', icon: <IconCoins />, render: (lk) => <PrestamosSection lookups={lk} view="prestamos" /> },
            { key: 'cuotas', label: 'Cuotas de préstamos', icon: <IconList />, render: (lk) => <PrestamosSection lookups={lk} view="cuotas" /> },
        ],
    },
    {
        label: 'Prestaciones',
        items: [
            { key: 'decimo', label: 'Décimo tercer mes', icon: <IconAward />, render: (lk) => <BeneficiosSection lookups={lk} view="decimo" /> },
            { key: 'indemnizacion', label: 'Indemnización', icon: <IconCoins />, render: (lk) => <BeneficiosSection lookups={lk} view="indemnizacion" /> },
            { key: 'pagos', label: 'Pagos de beneficios', icon: <IconLogOut />, render: (lk) => <BeneficiosSection lookups={lk} view="pagos" /> },
            { key: 'liquidaciones', label: 'Liquidaciones', icon: <IconLogOut />, render: (lk) => <LiquidacionesSection lookups={lk} /> },
        ],
    },
    {
        label: 'Parámetros',
        items: [
            { key: 'inss', label: 'INSS', icon: <IconSliders />, render: (lk) => <ParametrosSection lookups={lk} view="inss" /> },
            { key: 'ir', label: 'Tramos de IR', icon: <IconTrend />, render: (lk) => <ParametrosSection lookups={lk} view="ir" /> },
            { key: 'feriados', label: 'Feriados', icon: <IconCalendar />, render: (lk) => <ParametrosSection lookups={lk} view="feriados" /> },
        ],
    },
];

const ALL_ITEMS = MENU.flatMap(g => g.items);
const STORAGE_KEY = 'hr-active-view';

const readStoredView = (): ViewKey => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY) as ViewKey | null;
        if (saved && ALL_ITEMS.some(i => i.key === saved)) return saved;
    } catch { /* almacenamiento no disponible */ }
    return 'empleados';
};

const HR = () => {
    const [activeView, setActiveView] = useState<ViewKey>(readStoredView);
    const [navOpen, setNavOpen] = useState(true);
    const lookups = useLookups();

    const selectView = (key: ViewKey) => {
        setActiveView(key);
        try { localStorage.setItem(STORAGE_KEY, key); } catch { /* almacenamiento no disponible */ }
    };

    const group = MENU.find(g => g.items.some(i => i.key === activeView))!;
    const item = ALL_ITEMS.find(i => i.key === activeView)!;

    return (
        <div className="page-container">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0, border: 'none', marginBottom: '1.5rem' }}>
                <div>
                    <h2 className="card-title" style={{ fontSize: '1.5rem' }}>Recursos Humanos & Planilla</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Gestión de empleados, asistencia, planilla, préstamos, vacaciones, beneficios y liquidaciones.
                    </p>
                </div>
            </div>

            <div>
                {navOpen && <SectionNav title="Recursos Humanos" ariaLabel="Secciones de Recursos Humanos" groups={MENU} active={activeView} onSelect={selectView} />}

                <div style={{ minWidth: 0 }}>
                    <select
                        className="form-input hr-nav-select"
                        aria-label="Sección de Recursos Humanos"
                        value={activeView}
                        onChange={(e) => selectView(e.target.value as ViewKey)}
                        style={{ marginBottom: '1rem', height: '44px', padding: '0 12px', lineHeight: '44px' }}
                    >
                        {MENU.map(g => (
                            <optgroup key={g.label} label={g.label}>
                                {g.items.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
                            </optgroup>
                        ))}
                    </select>

                    <div className="hr-breadcrumb">
                        <SectionNavToggle open={navOpen} onToggle={() => setNavOpen(o => !o)} />
                        <span>{group.label}</span>
                        <span>/</span>
                        <strong>{item.label}</strong>
                    </div>

                    <div className="card" style={{ padding: '1.5rem' }}>
                        {lookups.isLoading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando datos...</div>
                        ) : (
                            <div key={activeView}>{item.render(lookups)}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HR;
