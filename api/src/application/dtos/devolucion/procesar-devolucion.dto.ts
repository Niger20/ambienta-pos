import { MetodoDevolucion, TipoDevolucion } from "../../../domain/entitites/devolucion.entity";
import { CreateVentaPagoDto } from "../venta-pago/create-venta-pago.dto";

export interface LineaDevuelta {
    productoid: number;
    cantidad: number;
}

export interface LineaCambio {
    productoid: number;
    cantidad: number;
}

const parseLineas = (raw: unknown, etiqueta: string): [string?, { productoid: number; cantidad: number }[]?] => {
    if (!Array.isArray(raw)) return [`${etiqueta} debe ser una lista`, undefined];
    const vistos = new Set<number>();
    const lineas: { productoid: number; cantidad: number }[] = [];
    for (const item of raw) {
        const productoid = Number(item?.productoid);
        const cantidad = Number(item?.cantidad);
        if (!Number.isInteger(productoid)) return [`${etiqueta}: producto inválido`, undefined];
        if (Number.isNaN(cantidad) || cantidad <= 0) return [`${etiqueta}: la cantidad debe ser mayor a cero`, undefined];
        if (vistos.has(productoid)) return [`${etiqueta}: el producto #${productoid} está repetido`, undefined];
        vistos.add(productoid);
        lineas.push({ productoid, cantidad });
    }
    return [undefined, lineas];
};

/**
 * Una operación de devolución: uno o varios productos de una venta que regresan al
 * inventario, con su compensación al cliente:
 *   REEMBOLSO -> se baja su deuda y/o se le devuelve dinero por el método elegido.
 *   CAMBIO    -> además se le entregan otros productos (venta nueva, cobrada con el método elegido).
 */
export class ProcesarDevolucionDto {

    private constructor(
        public readonly ventaid: number,
        public readonly usuarioid: number,
        public readonly motivo: string,
        public readonly tipo: TipoDevolucion,
        public readonly lineas: LineaDevuelta[],
        public readonly cambio: LineaCambio[],
        public readonly metodopago: MetodoDevolucion | null,
        public readonly banco: string | null,
        public readonly numerotransferencia: string | null,
        public readonly fecha: Date,
    ) {}

    static create(props: { [key: string]: any }): [string?, ProcesarDevolucionDto?] {
        const ventaid = Number(props.ventaid);
        if (props.ventaid == null || !Number.isInteger(ventaid)) return ['La venta ID es obligatoria', undefined];

        const usuarioid = Number(props.usuarioid);
        if (props.usuarioid == null || !Number.isInteger(usuarioid)) return ['El usuario ID es obligatorio', undefined];

        if (!props.motivo || typeof props.motivo !== 'string' || !props.motivo.trim()) return ['El motivo es obligatorio', undefined];

        const tipo: TipoDevolucion = props.tipo === 'CAMBIO' ? 'CAMBIO' : 'REEMBOLSO';
        if (props.tipo != null && props.tipo !== 'CAMBIO' && props.tipo !== 'REEMBOLSO') return ['El tipo debe ser REEMBOLSO o CAMBIO', undefined];

        const [errLineas, lineas] = parseLineas(props.lineas, 'Productos a devolver');
        if (errLineas) return [errLineas, undefined];
        if (lineas!.length === 0) return ['Indique al menos un producto a devolver', undefined];

        let cambio: LineaCambio[] = [];
        if (tipo === 'CAMBIO') {
            const [errCambio, parsed] = parseLineas(props.cambio, 'Productos del cambio');
            if (errCambio) return [errCambio, undefined];
            if (parsed!.length === 0) return ['Un cambio requiere al menos un producto nuevo', undefined];
            cambio = parsed!;
        }

        // Mismo criterio que el POS: BAC / LAFISE se registran como TRANSFERENCIA con su banco.
        if (tipo === 'CAMBIO' && !props.metodopago) return ['Indique el método de pago del cambio', undefined];
        let metodo: MetodoDevolucion | null = null;
        let banco: string | null = null;
        let numero: string | null = null;
        if (props.metodopago) {
            const pago = CreateVentaPagoDto.normalizarMetodo(String(props.metodopago), props.banco, props.numerotransferencia);
            metodo = pago.metodopago as MetodoDevolucion;
            banco = pago.banco;
            numero = pago.numerotransferencia;
        }

        let fecha = new Date();
        if (props.fecha != null) {
            const d = new Date(props.fecha);
            if (isNaN(d.getTime())) return ['La fecha es inválida', undefined];
            fecha = d;
        }

        return [undefined, new ProcesarDevolucionDto(
            ventaid, usuarioid, props.motivo.trim(), tipo, lineas!, cambio,
            metodo, banco, numero,
            fecha,
        )];
    }
}
