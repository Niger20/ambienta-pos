import { useState } from 'react';
import type { ReactNode } from 'react';
import './hr.css';
import { SectionNav, SectionNavToggle } from '../../components/SectionNav';
import { useLookups } from './useLookups';
import type { Lookups } from './useLookups';
import { IconUsers, IconBuilding, IconAward, IconSliders, IconTrend, IconCalendar, IconWallet } from './icons';
import { EmpleadosSection } from './EmpleadosSection';
import { PlanillaSection } from './PlanillaSection';
import { EstructuraSection } from './EstructuraSection';
import { ParametrosSection } from './ParametrosSection';

type ViewKey =
    | 'empleados' | 'departamentos' | 'cargos'
    | 'planilla'
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

// Secciones disponibles en esta etapa; el resto de módulos de RRHH se incorpora después.
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
        label: 'Nómina',
        items: [
            { key: 'planilla', label: 'Planilla', icon: <IconWallet />, render: (lk) => <PlanillaSection lookups={lk} /> },
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
                        Gestión de empleados, estructura organizacional y parámetros.
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
