import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { SectionPanelSlotContext } from '../components/sectionPanelContext';

// Secciones con submenú propio: en escritorio se minimiza el menú principal al entrar
const SECTIONS_WITH_SUBMENU = ['/reportes', '/rrhh'];
const DESKTOP_QUERY = '(min-width: 1025px)';

const MainLayout = () => {
    const { pathname, key: visitKey } = useLocation();
    const hasSubmenu = SECTIONS_WITH_SUBMENU.some(p => pathname === p || pathname.startsWith(`${p}/`));

    const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [panelSlot, setPanelSlot] = useState<HTMLElement | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        return localStorage.getItem('sidebar-collapsed') === 'true';
    });
    // Expansión temporal del menú principal, ligada a esta visita (cada navegación tiene su key, así que al volver se minimiza otra vez)
    const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
    const submenuSidebarExpanded = expandedVisit === visitKey;

    useEffect(() => {
        const mq = window.matchMedia(DESKTOP_QUERY);
        const onChange = () => setIsDesktop(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const forceCollapsed = isDesktop && hasSubmenu;
    const collapsed = forceCollapsed ? !submenuSidebarExpanded : sidebarCollapsed;

    const handleToggleSidebar = () => {
        if (window.innerWidth > 1024) {
            if (hasSubmenu) {
                setExpandedVisit(prev => (prev === visitKey ? null : visitKey));
                return;
            }
            setSidebarCollapsed(prev => {
                const newValue = !prev;
                localStorage.setItem('sidebar-collapsed', String(newValue));
                return newValue;
            });
        } else {
            setSidebarOpen(prev => !prev);
        }
    };

    return (
        <SectionPanelSlotContext.Provider value={panelSlot}>
            <div className="layout-container">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={collapsed} />
                {/* Panel de secciones de Reportes / RRHH: ocupa todo el lateral, pegado al menú principal */}
                <div className="section-panel-slot" ref={setPanelSlot} />
                {sidebarOpen && <div className="sidebar-backdrop" onClick={(e) => { e.stopPropagation(); setSidebarOpen(false); }} />}
                <div className="layout-main">
                    <Header onToggleSidebar={handleToggleSidebar} />
                    <main className="layout-content">
                        <Outlet />
                    </main>
                </div>
            </div>
        </SectionPanelSlotContext.Provider>
    );
};

export default MainLayout;
