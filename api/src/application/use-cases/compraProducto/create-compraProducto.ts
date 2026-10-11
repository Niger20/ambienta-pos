import { CreateCompraProductoDto } from "../../dtos";
import { CompraProductoEntity } from "../../../domain/entitites/compraProducto.entity";
import { CompraProductoRepository } from "../../repositories/compraProducto.repository";

export interface CreateCompraProductoUseCase {
    execute(dto: CreateCompraProductoDto): Promise<CompraProductoEntity>;
}

export class CreateCompraProducto implements CreateCompraProductoUseCase {
    constructor(private readonly repository: CompraProductoRepository) {}

    execute(dto: CreateCompraProductoDto): Promise<CompraProductoEntity> {
        return this.repository.create(dto);
    }
}
