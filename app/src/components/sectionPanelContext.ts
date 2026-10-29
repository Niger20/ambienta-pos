import { createContext } from 'react';

// Elemento del layout donde las páginas con submenú montan su panel lateral (junto al menú principal)
export const SectionPanelSlotContext = createContext<HTMLElement | null>(null);
