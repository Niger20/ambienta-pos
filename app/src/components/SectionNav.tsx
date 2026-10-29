import { useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SectionPanelSlotContext } from './sectionPanelContext';
import './SectionNav.css';

export interface SectionNavItem<K extends string> { key: K; label: string; icon?: ReactNode }
export interface SectionNavGroup<K extends string> { label: string; items: SectionNavItem<K>[] }

interface SectionNavProps<K extends string> {
    title: string;
    ariaLabel: string;
    groups: SectionNavGroup<K>[];
    active: K;
    onSelect: (key: K) => void;
}

// Minúsculas y sin tildes, para que "prestamos" encuentre "Préstamos"
const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Panel lateral de secciones con buscador y grupos plegables (diseño "Prototipo Menus").
// Se monta por portal en la ranura del MainLayout para ocupar todo el lateral junto al menú principal.
export const SectionNav = <K extends string>({ title, ariaLabel, groups, active, onSelect }: SectionNavProps<K>) => {
    const slot = useContext(SectionPanelSlotContext);
    const [query, setQuery] = useState('');
    const [closed, setClosed] = useState<Record<string, boolean>>({});

    const q = normalize(query.trim());
    const visible = groups
        .map(g => ({ ...g, items: g.items.filter(i => !q || normalize(i.label).includes(q)) }))
        .filter(g => g.items.length > 0);

    if (!slot) return null;

    return createPortal(
        <aside className="sec-nav" aria-label={ariaLabel}>
            <div className="sec-nav-title-main">{title}</div>
            <div className="sec-nav-search">
                <input
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar sección…"
                    aria-label="Buscar sección"
                />
            </div>
            <nav className="sec-nav-scroll">
                {visible.map(g => {
                    const isOpen = !!q || !closed[g.label];
                    return (
                        <div className="sec-nav-group" key={g.label}>
                            <button
                                type="button"
                                className="sec-nav-title"
                                aria-expanded={isOpen}
                                onClick={() => setClosed(c => ({ ...c, [g.label]: !c[g.label] }))}
                            >
                                <span>{g.label}</span>
                                <span className={`sec-nav-chev${isOpen ? '' : ' closed'}`} aria-hidden="true">▾</span>
                            </button>
                            {isOpen && g.items.map(i => (
                                <button
                                    key={i.key}
                                    type="button"
                                    className={`sec-nav-item${active === i.key ? ' active' : ''}`}
                                    aria-current={active === i.key ? 'page' : undefined}
                                    onClick={() => onSelect(i.key)}
                                >
                                    {i.icon}
                                    <span>{i.label}</span>
                                </button>
                            ))}
                        </div>
                    );
                })}
                {q && visible.length === 0 && <div className="sec-nav-empty">Sin coincidencias</div>}
            </nav>
        </aside>,
        slot
    );
};

// Botón para mostrar u ocultar el panel de secciones
export const SectionNavToggle = ({ open, onToggle }: { open: boolean; onToggle: () => void }) => (
    <button
        type="button"
        className="sec-nav-toggle"
        onClick={onToggle}
        aria-pressed={open}
        aria-label="Mostrar u ocultar panel"
        title="Mostrar u ocultar panel"
    >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 4h18v16H3z" />
            <path d="M9 4v16" />
        </svg>
    </button>
);
