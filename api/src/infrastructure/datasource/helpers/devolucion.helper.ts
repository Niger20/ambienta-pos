// Método de pago con que se registra, en la cuenta por cobrar, la nota de crédito
// que genera una devolución sobre una venta a crédito. No es dinero: no entra a caja.
export const NOTA_CREDITO = 'NOTA_CREDITO';

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

// Tolerancia para comparar montos con 2 decimales.
export const EPSILON = 0.004;
