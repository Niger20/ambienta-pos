import { VentaEntity } from "../../../domain/entitites/venta.entity";
import { CheckoutVentaDto } from "../../dtos";
import { VentaRepository } from "../../repositories/venta.repository";


export interface CheckoutVentaUseCase {
    execute(dto: CheckoutVentaDto): Promise<VentaEntity>;
}

const redondear = (n: number) => Math.round(n * 10000) / 10000;

export class CheckoutVenta implements CheckoutVentaUseCase {

    constructor(private readonly ventaRepository: VentaRepository) { }

    // El total lo calcula el sistema a partir de las líneas (no lo envía el
    // cliente), así cabecera y detalle nunca pueden quedar descuadrados. El
    // repositorio guarda todo el cobro de forma atómica.
    async execute(dto: CheckoutVentaDto): Promise<VentaEntity> {
        const subtotal = redondear(dto.lineas.reduce((s, l) => s + l.preciounitario * l.cantidad - l.descuento, 0));
        if (dto.descuentofactura > subtotal) throw 'El descuento de factura no puede superar el subtotal';

        const total = redondear(subtotal - dto.descuentofactura + (dto.delivery?.costo ?? 0));

        return this.ventaRepository.checkout(dto, total);
    }

}
