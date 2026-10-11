import { Prisma } from "../../../generated/prisma/client";

type Tx = Prisma.TransactionClient;

// Detalle de persistencia compartido por los datasources que mueven stock.
// Decremento atómico y condicionado: dos cajas vendiendo el mismo producto a la
// vez no pueden pisarse (lectura-escritura) ni dejar el stock por debajo de 0.
// Devuelve el stock que había justo antes del movimiento.
export async function descontarStock(tx: Tx, productoid: number, cantidad: Prisma.Decimal | number | string): Promise<Prisma.Decimal> {
    const qty = new Prisma.Decimal(cantidad);

    const { count } = await tx.productos.updateMany({
        where: { productoid, stockactual: { gte: qty } },
        data: { stockactual: { decrement: qty } },
    });

    const producto = await tx.productos.findUnique({
        where: { productoid },
        select: { nombre: true, stockactual: true },
    });
    if (!producto) throw 'Producto no encontrado';

    const actual = producto.stockactual ?? new Prisma.Decimal(0);
    if (count === 0) {
        throw `Stock insuficiente para "${producto.nombre}": disponible ${actual.toString()}, requerido ${qty.toString()}`;
    }

    return actual.plus(qty);
}

// Devuelve el stock que había justo antes del movimiento.
export async function aumentarStock(tx: Tx, productoid: number, cantidad: Prisma.Decimal | number | string): Promise<Prisma.Decimal> {
    const qty = new Prisma.Decimal(cantidad);

    const producto = await tx.productos.update({
        where: { productoid },
        data: { stockactual: { increment: qty } },
        select: { stockactual: true },
    });

    return (producto.stockactual ?? new Prisma.Decimal(0)).minus(qty);
}

// Registra un movimiento de inventario con cantidad con signo (negativa en salidas).
export function registrarMovimiento(tx: Tx, mov: {
    productoid: number;
    tipomovimiento: 'INGRESO' | 'EGRESO' | 'MERMA';
    cantidad: Prisma.Decimal | number;
    stockanterior: Prisma.Decimal;
    motivo: string;
    fecha?: Date | null;
}) {
    return tx.movimientosinventario.create({
        data: {
            productoid: mov.productoid,
            tipomovimiento: mov.tipomovimiento,
            cantidad: mov.cantidad,
            stockanterior: mov.stockanterior,
            motivo: mov.motivo,
            fecha: mov.fecha ?? undefined,
        },
        include: { productos: true },
    });
}
