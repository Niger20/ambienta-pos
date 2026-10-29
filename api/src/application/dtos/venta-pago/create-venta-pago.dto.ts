export class CreateVentaPagoDto {

    private constructor(
        public readonly ventaid: number,
        public readonly metodopago: string,
        public readonly monto: number,
        public readonly banco?: string | null,
        public readonly numerotransferencia?: string | null,
    ) {}

    static create(props: { [key: string]: any }): [string?, CreateVentaPagoDto?] {
        const { ventaid, metodopago, monto, banco, numerotransferencia } = props;

        if (ventaid == null) return ['La venta ID es obligatoria', undefined];
        const parsedVentaId = Number(ventaid);
        if (Number.isNaN(parsedVentaId) || !Number.isInteger(parsedVentaId)) {
            return ['La venta ID debe ser un número entero válido', undefined];
        }

        if (!metodopago) return ['El método de pago es obligatorio', undefined];
        if (typeof metodopago !== 'string') return ['El método de pago debe ser una cadena de texto', undefined];

        if (monto == null) return ['El monto es obligatorio', undefined];
        const parsedMonto = Number(monto);
        if (Number.isNaN(parsedMonto) || parsedMonto <= 0) {
            return ['El monto debe ser un número positivo mayor a cero', undefined];
        }

        const pago = CreateVentaPagoDto.normalizarMetodo(metodopago, banco, numerotransferencia);

        return [
            undefined,
            new CreateVentaPagoDto(
                parsedVentaId,
                pago.metodopago,
                parsedMonto,
                pago.banco,
                pago.numerotransferencia
            )
        ];
    }

    static normalizarMetodo(metodopago: string, banco?: any, numerotransferencia?: any): { metodopago: string; banco: string | null; numerotransferencia: string | null } {
        const rawMetodo = metodopago.trim().toUpperCase();
        let finalBanco: string | null = banco ? String(banco).trim() : null;
        let finalNumeroTransferencia: string | null = numerotransferencia ? String(numerotransferencia).trim() : null;

        if (['BAC', 'LAFISE', 'BANPRO', 'TRANSFERENCIA', 'TRANSFER', 'TRANS'].includes(rawMetodo)) {
            if (!finalBanco) finalBanco = rawMetodo === 'TRANSFERENCIA' ? 'BANCO' : rawMetodo;
            if (!finalNumeroTransferencia) finalNumeroTransferencia = 'N/A';
            return { metodopago: 'TRANSFERENCIA', banco: finalBanco, numerotransferencia: finalNumeroTransferencia };
        }
        if (['TARJETA', 'CARD', 'DEBITO', 'CREDITO_TARJETA'].includes(rawMetodo)) {
            // chk_numero_transferencia exige NULL si MetodoPago <> 'TRANSFERENCIA'
            return { metodopago: 'TARJETA', banco: finalBanco || 'TARJETA', numerotransferencia: null };
        }
        // EFECTIVO y fallback: chk_banco_requerido exige banco NULL
        return { metodopago: 'EFECTIVO', banco: null, numerotransferencia: null };
    }
}
