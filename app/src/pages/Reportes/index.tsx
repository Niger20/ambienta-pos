import { useState, useEffect } from 'react';
import '../HR/hr.css'; // Layout de dos columnas compartido con Recursos Humanos
import { SectionNav, SectionNavToggle } from '../../components/SectionNav';
import type { ReactNode } from 'react';
import type { Tab } from './types';
import {
    IconReportDoc, IconPackage, IconTrendingUp, IconHourglass, IconArrowDownCircle, IconArrowUpCircle, IconReceipt,
} from './icons';
import { useUtilidadProductoReport } from './useUtilidadProductoReport';
import { useCxcReport } from './useCxcReport';
import { useCxpReport } from './useCxpReport';
import { useGastosReport } from './useGastosReport';
import { UtilidadProductoTab } from './UtilidadProductoTab';
import { CxcTab } from './CxcTab';
import { CxpTab } from './CxpTab';
import { GastosTab } from './GastosTab';
import { EstadoResultadosReport } from './gestion/EstadoResultadosReport';
import { FlujoCajaReport, AntiguedadSaldosReport } from './gestion/FinanzasReports';

interface Item { key: Tab; label: string; icon: ReactNode; /** El reporte depende del rango de fechas global. */ fechas: boolean }
interface Grupo { label: string; items: Item[] }

const MENU: Grupo[] = [
    {
        label: 'Resultados',
        items: [
            { key: 'utilidad', label: 'Estado de Resultados', icon: <IconReportDoc />, fechas: true },
            { key: 'utilidadProducto', label: 'Utilidad por producto', icon: <IconPackage />, fechas: true },
        ],
    },
    {
        label: 'Caja y finanzas',
        items: [
            { key: 'flujoCaja', label: 'Flujo de caja', icon: <IconTrendingUp />, fechas: true },
            { key: 'antiguedad', label: 'Antigüedad de saldos', icon: <IconHourglass />, fechas: false },
            { key: 'cxc', label: 'Cuentas por cobrar', icon: <IconArrowDownCircle />, fechas: true },
            { key: 'cxp', label: 'Cuentas por pagar', icon: <IconArrowUpCircle />, fechas: true },
            { key: 'gastos', label: 'Gastos operativos', icon: <IconReceipt />, fechas: false },
        ],
    },
];

const ALL_ITEMS = MENU.flatMap(g => g.items);
const STORAGE_KEY = 'reportes-active-view';

const readStored = (): Tab => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY) as Tab | null;
        if (saved && ALL_ITEMS.some(i => i.key === saved)) return saved;
    } catch { /* almacenamiento no disponible */ }
    return 'utilidad';
};

const Reportes = () => {
    const [activeTab, setActiveTab] = useState<Tab>(readStored);
    const [isLoading, setIsLoading] = useState(false);
    const [navOpen, setNavOpen] = useState(true);

    // Rango de fechas global
    const [fechaInicio, setFechaInicio] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
    const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);

    const {
        fetchUtilidadProducto,
        utilidadProductoSearch, setUtilidadProductoSearch,
        utilidadSortField, setUtilidadSortField,
        utilidadSortDirection, setUtilidadSortDirection,
        filteredAndSortedUtilidadProducto, utilidadProductoSummary,
    } = useUtilidadProductoReport(fechaInicio, fechaFin, setIsLoading);
    const { cxcData, clientesMap, fetchCxc, cxcSummary } = useCxcReport(fechaInicio, fechaFin, setIsLoading);
    const { cxpData, proveedoresMap, fetchCxp, cxpSummary } = useCxpReport(fechaInicio, fechaFin, setIsLoading);
    const { gastosData, fetchGastos, gastosSummary } = useGastosReport(setIsLoading);

    useEffect(() => {
        if (activeTab === 'utilidadProducto') fetchUtilidadProducto();
        if (activeTab === 'cxc') fetchCxc();
        if (activeTab === 'cxp') fetchCxp();
        if (activeTab === 'gastos') fetchGastos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, fechaInicio, fechaFin]);

    const selectTab = (key: Tab) => {
        setActiveTab(key);
        try { localStorage.setItem(STORAGE_KEY, key); } catch { /* almacenamiento no disponible */ }
    };

    const grupo = MENU.find(g => g.items.some(i => i.key === activeTab))!;
    const item = ALL_ITEMS.find(i => i.key === activeTab)!;
    const rango = { fechaInicio, fechaFin };

    const contenido = (() => {
        switch (activeTab) {
            case 'utilidad': return <EstadoResultadosReport {...rango} />;
            case 'utilidadProducto': return (
                <UtilidadProductoTab
                    utilidadProductoSummary={utilidadProductoSummary}
                    utilidadProductoSearch={utilidadProductoSearch}
                    setUtilidadProductoSearch={setUtilidadProductoSearch}
                    utilidadSortField={utilidadSortField}
                    setUtilidadSortField={setUtilidadSortField}
                    utilidadSortDirection={utilidadSortDirection}
                    setUtilidadSortDirection={setUtilidadSortDirection}
                    filteredAndSortedUtilidadProducto={filteredAndSortedUtilidadProducto}
                />
            );
            case 'flujoCaja': return <FlujoCajaReport {...rango} />;
            case 'antiguedad': return <AntiguedadSaldosReport />;
            case 'cxc': return <CxcTab cxcData={cxcData} clientesMap={clientesMap} cxcSummary={cxcSummary} />;
            case 'cxp': return <CxpTab cxpData={cxpData} proveedoresMap={proveedoresMap} cxpSummary={cxpSummary} />;
            case 'gastos': return <GastosTab gastosData={gastosData} gastosSummary={gastosSummary} />;
        }
    })();

    return (
        <div className="page-container">
            <div className="card-header" style={{ padding: 0, marginBottom: '1.5rem', border: 'none' }}>
                <h2 className="card-title" style={{ fontSize: '1.5rem' }}>Reportes Detallados</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Visualice y filtre los reportes de rendimiento del sistema.</p>
            </div>

            <div>
                {navOpen && <SectionNav title="Reportes" ariaLabel="Reportes" groups={MENU} active={activeTab} onSelect={selectTab} />}

                <div style={{ minWidth: 0 }}>
                    <select
                        className="form-input hr-nav-select"
                        aria-label="Reporte"
                        value={activeTab}
                        onChange={(e) => selectTab(e.target.value as Tab)}
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
                        <span>{grupo.label}</span>
                        <span>/</span>
                        <strong>{item.label}</strong>
                    </div>

                    {/* Rango de fechas global */}
                    {item.fechas && (
                        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1rem 1.25rem', flexWrap: 'wrap', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Desde:</span>
                                <input type="date" className="form-input" style={{ padding: '0.45rem 0.75rem', width: 'auto', height: '36px', borderRadius: '8px' }} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Hasta:</span>
                                <input type="date" className="form-input" style={{ padding: '0.45rem 0.75rem', width: 'auto', height: '36px', borderRadius: '8px' }} value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                            </div>
                            {isLoading && <span style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', fontWeight: 500, animation: 'cdPulse 1.5s infinite' }}>Cargando datos...</span>}
                            {(activeTab === 'cxc' || activeTab === 'cxp') && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                                    (Filtra por creación; si está vacío en rango, muestra todas las activas)
                                </span>
                            )}
                        </div>
                    )}

                    <div key={activeTab}>{contenido}</div>
                </div>
            </div>
        </div>
    );
};

export default Reportes;
