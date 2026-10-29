import { CreateVentaPagoDto } from "../venta-pago/create-venta-pago.dto";

export interface CheckoutVentaLineaDto {
    productoid: number;
    cantidad: number;
    preciounitario: number;
    descuento: number;
}

export interface CheckoutVentaPagoDto {
    metodopago: string;
    monto: number;
    banco: string | null;
    numerotransferencia: string | null;
}

export interface CheckoutVentaDeliveryDto {
    repartidorid: number;
    direccionentrega: string;
    costo: number;
}

const TIPOS_VENTA = ['CONTADO', 'CREDITO', 'COTIZACION'];
const LUGARES_VENTA = ['NORMAL', 'DELIVERY'];
const TIPOS_FACTURA = ['FISCAL', 'NO_FISCAL'];

export class CheckoutVentaDto {

    private constructor(
        public readonly sesionid: number,
        public readonly tipoventa: string,
        public readonly lugarventa: string,
        public readonly clienteid: number | null,
        public readonly tipofactura: string | null,
        public readonly descuentofactura: number,
        public readonly lineas: CheckoutVentaLineaDto[],
        public readonly pagos: CheckoutVentaPagoDto[],
        public readonly fechavencimiento: Date | null,
        public readonly delivery: CheckoutVentaDeliveryDto | null,
    ) { }

    static create(props: { [key: string]: any }): [string?, CheckoutVentaDto?] {
        const { sesionid, tipoventa, lugarventa, clienteid, tipofactura, descuentofactura, lineas, pagos, fechavencimiento, delivery } = props;

        const parsedSesionId = Number(sesionid);
        if (sesionid == null || !Number.isInteger(parsedSesionId)) return ['El sesion id es obligatorio y debe ser un entero', undefined];

        if (!TIPOS_VENTA.includes(tipoventa)) return [`El tipo de venta debe ser ${TIPOS_VENTA.join(', ')}`, undefined];
        if (!LUGARES_VENTA.includes(lugarventa)) return [`El lugar de venta debe ser ${LUGARES_VENTA.join(' o ')}`, undefined];

        let parsedClienteId: number | null = null;
        if (clienteid != null) {
            parsedClienteId = Number(clienteid);
            if (!Number.isInteger(parsedClienteId)) return ['El cliente id debe ser un entero', undefined];
        }

        const esCotizacion = tipoventa === 'COTIZACION';
        // null = "Sin Consecutivo" (válido); una cotización nunca lleva consecutivo.
        let parsedTipoFactura: string | null = null;
        if (!esCotizacion && tipofactura != null) {
            if (!TIPOS_FACTURA.includes(tipofactura)) return [`El tipo de factura debe ser ${TIPOS_FACTURA.join(' o ')}`, undefined];
            parsedTipoFactura = tipofactura;
        }

        // ---- Líneas ----
        if (!Array.isArray(lineas) || lineas.length === 0) return ['La venta debe tener al menos un producto', undefined];
        const parsedLineas: CheckoutVentaLineaDto[] = [];
        const vistos = new Set<number>();
        for (const [i, l] of lineas.entries()) {
            const n = i + 1;
            const productoid = Number(l?.productoid);
            const cantidad = Number(l?.cantidad);
            const preciounitario = Number(l?.preciounitario);
            const descuento = Number(l?.descuento ?? 0);

            if (!Number.isInteger(productoid)) return [`Línea ${n}: producto inválido`, undefined];
            if (vistos.has(productoid)) return [`Línea ${n}: el producto está repetido en la venta`, undefined];
            vistos.add(productoid);
            if (!Number.isFinite(cantidad) || cantidad <= 0) return [`Línea ${n}: la cantidad debe ser mayor a 0`, undefined];
            if (!Number.isFinite(preciounitario) || preciounitario < 0) return [`Línea ${n}: el precio unitario es inválido`, undefined];
            // El descuento de línea es un MONTO (no un porcentaje) y no puede superar el importe de la línea.
            if (!Number.isFinite(descuento) || descuento < 0 || descuento > preciounitario * cantidad) {
                return [`Línea ${n}: el descuento debe estar entre 0 y el importe de la línea`, undefined];
            }
            parsedLineas.push({ productoid, cantidad, preciounitario, descuento });
        }

        const parsedDescuentoFactura = Number(descuentofactura ?? 0);
        if (!Number.isFinite(parsedDescuentoFactura) || parsedDescuentoFactura < 0) return ['El descuento de factura es inválido', undefined];

        // ---- Pagos (una cotización no se cobra) ----
        const parsedPagos: CheckoutVentaPagoDto[] = [];
        if (!esCotizacion) {
            if (!Array.isArray(pagos) || pagos.length === 0) return ['Debe indicar al menos un pago', undefined];
            for (const p of pagos) {
                const monto = Number(p?.monto);
                if (typeof p?.metodopago !== 'string' || !p.metodopago.trim()) return ['Cada pago debe tener un método de pago', undefined];
                if (!Number.isFinite(monto) || monto <= 0) return ['El monto de cada pago debe ser mayor a 0', undefined];
                parsedPagos.push({ ...CreateVentaPagoDto.normalizarMetodo(p.metodopago, p.banco, p.numerotransferencia), monto });
            }
        }

        // ---- Crédito ----
        let parsedVencimiento: Date | null = null;
        if (tipoventa === 'CREDITO') {
            if (parsedClienteId == null) return ['Las ventas al crédito requieren un cliente', undefined];
            parsedVencimiento = new Date(fechavencimiento);
            if (fechavencimiento == null || Number.isNaN(parsedVencimiento.getTime())) return ['La fecha de vencimiento del crédito es inválida', undefined];
        }

        // ---- Delivery ----
        let parsedDelivery: CheckoutVentaDeliveryDto | null = null;
        if (lugarventa === 'DELIVERY') {
            const repartidorid = Number(delivery?.repartidorid);
            const costo = Number(delivery?.costo);
            const direccionentrega = typeof delivery?.direccionentrega === 'string' ? delivery.direccionentrega.trim() : '';
            if (!Number.isInteger(repartidorid)) return ['Seleccione un repartidor para el delivery', undefined];
            if (!direccionentrega) return ['Ingrese la dirección de entrega', undefined];
            if (!Number.isFinite(costo) || costo < 0) return ['El costo de envío es inválido', undefined];
            parsedDelivery = { repartidorid, direccionentrega, costo };
        }

        return [undefined, new CheckoutVentaDto(
            parsedSesionId, tipoventa, lugarventa, parsedClienteId, parsedTipoFactura,
            parsedDescuentoFactura, parsedLineas, parsedPagos, parsedVencimiento, parsedDelivery,
        )];
    }
}
