import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    CreateCompraProductoDto,
    CompraProductoDatasource,
    CompraProductoRepository,
} from "../../application";
import {
    CompraProductoEntity,
} from "../../domain";

export class CompraProductoRepositoryImpl implements CompraProductoRepository {

    constructor(private readonly datasource: CompraProductoDatasource) { }

    create(dto: CreateCompraProductoDto): Promise<CompraProductoEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number): Promise<PaginatedResult<CompraProductoEntity>> {
        return this.datasource.getAll(page, limit);
    }

    getByCompraId(compraid: number): Promise<CompraProductoEntity[]> {
        return this.datasource.getByCompraId(compraid);
    }
}
