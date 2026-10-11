import { PaginatedResult } from "../dtos/shared/pagination.dto";
import { CompraProductoEntity } from "../../domain/entitites/compraProducto.entity";
import { CreateCompraProductoDto } from "../dtos";

export abstract class CompraProductoRepository {
    abstract create(dto: CreateCompraProductoDto): Promise<CompraProductoEntity>;
    abstract getAll(page?: number, limit?: number): Promise<PaginatedResult<CompraProductoEntity>>;
    abstract getByCompraId(compraid: number): Promise<CompraProductoEntity[]>;
}
