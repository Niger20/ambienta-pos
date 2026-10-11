// Regla de negocio: costo promedio ponderado (moving average cost) de un producto
// al recibir una compra. Función pura: no toca la base de datos.
export function costoPromedioPonderado(
    stockActual: number,
    costoActual: number,
    cantidadComprada: number,
    precioCompra: number,
): number {
    let costo = precioCompra;

    if (stockActual > 0) {
        const totalUnidades = stockActual + cantidadComprada;
        if (totalUnidades > 0) {
            costo = ((stockActual * costoActual) + (cantidadComprada * precioCompra)) / totalUnidades;
        }
    }

    return Math.round(costo * 100) / 100;
}
