import { PaginatedResult } from "../dtos/shared/pagination.dto";
import { VentaProductoEntity } from "../../domain/entitites/ventaProducto.entity";

export abstract class VentaProductoRepository {

    abstract getAll(page?: number, limit?: number): Promise<PaginatedResult<VentaProductoEntity>>;
    abstract getByVentaId(ventaid: number): Promise<VentaProductoEntity[]>;
}
