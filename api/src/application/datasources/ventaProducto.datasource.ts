import { PaginatedResult } from "../dtos/shared/pagination.dto";
import { VentaProductoEntity } from "../../domain/entitites/ventaProducto.entity";

// Las líneas de venta solo se crean dentro del cobro (caso de uso CheckoutVenta),
// junto con su descuento de stock y movimiento de inventario.
export abstract class VentaProductoDatasource {

    abstract getAll(page?: number, limit?: number): Promise<PaginatedResult<VentaProductoEntity>>;
    abstract getByVentaId(ventaid: number): Promise<VentaProductoEntity[]>;
}
