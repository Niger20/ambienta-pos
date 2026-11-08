export type Tab =
    | 'utilidad' | 'utilidadProducto'
    | 'ventasPeriodo' | 'ventasCategoria' | 'topClientes' | 'libroVentas' | 'devoluciones'
    | 'flujoCaja' | 'antiguedad' | 'cxc' | 'cxp' | 'gastos'
    | 'valorizacion' | 'porVencer' | 'sinMovimiento' | 'mermas'
    | 'costoLaboral' | 'pasivoLaboral' | 'bitacora';

export const chipStyle = (color: string, bg?: string) => ({
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: bg || (color === 'var(--accent-success)' ? 'var(--accent-success-bg)' :
        color === 'var(--accent-danger)' ? 'var(--accent-danger-bg)' :
            color === 'var(--accent-warning)' ? 'var(--accent-warning-bg)' :
                color === 'var(--accent-primary)' ? 'var(--accent-primary-bg)' :
                    color.startsWith('var(') ? 'rgba(255, 255, 255, 0.08)' : `${color}18`),
    color,
});
