export type TipoDevolucion = 'REEMBOLSO' | 'CAMBIO';
export type MetodoDevolucion = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';

export class DevolucionEntity {

    constructor(
        public readonly id: number,
        public readonly ventaid: number,
        public readonly productoid: number,
        public readonly cantidad: number,
        public readonly motivo: string,
        public readonly montodevuelto: number,
        public readonly usuarioid: number,
        public readonly fecha?: Date | null,
        public readonly usuarionombre?: string | null,
        public readonly productonombre?: string | null,
        public readonly tipo: TipoDevolucion = 'REEMBOLSO',
        public readonly metodopago?: MetodoDevolucion | null,
        public readonly banco?: string | null,
        public readonly numerotransferencia?: string | null,
        // Cómo se compensó el monto devuelto: baja de la deuda del cliente (nota de crédito)
        // y/o dinero devuelto por el método elegido.
        public readonly montoacreditado: number = 0,
        public readonly montoreembolsado: number = 0,
        public readonly abonoid?: number | null,
        public readonly pagoid?: number | null,
        public readonly ventacambioid?: number | null,
    ) {}

    public static fromObject(object: { [key: string]: any }): DevolucionEntity {
        const id = object.id ?? object.devolucionid;
        const { ventaid, productoid, cantidad, motivo, montodevuelto, usuarioid, fecha } = object;

        if (id == null) throw 'ID es obligatorio';
        if (ventaid == null) throw 'Venta ID es obligatoria';
        if (productoid == null) throw 'Producto ID es obligatorio';
        if (cantidad == null) throw 'Cantidad es obligatoria';
        if (!motivo) throw 'Motivo es obligatorio';
        if (montodevuelto == null) throw 'Monto devuelto es obligatorio';
        if (usuarioid == null) throw 'Usuario ID es obligatorio';

        const usuarionombre = object.usuarios?.nombreusuario ?? object.usuarionombre ?? null;
        const productonombre = object.ventaproductos?.productos?.nombre ?? object.productonombre ?? null;

        return new DevolucionEntity(
            Number(id),
            Number(ventaid),
            Number(productoid),
            Number(cantidad),
            motivo,
            Number(montodevuelto),
            Number(usuarioid),
            fecha ? new Date(fecha) : null,
            usuarionombre,
            productonombre,
            object.tipo === 'CAMBIO' ? 'CAMBIO' : 'REEMBOLSO',
            object.metodopago ?? null,
            object.banco ?? null,
            object.numerotransferencia ?? null,
            Number(object.montoacreditado ?? 0),
            Number(object.montoreembolsado ?? 0),
            object.abonoid != null ? Number(object.abonoid) : null,
            object.pagoid != null ? Number(object.pagoid) : null,
            object.ventacambioid != null ? Number(object.ventacambioid) : null
        );
    }
}
