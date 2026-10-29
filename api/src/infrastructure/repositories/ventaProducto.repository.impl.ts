import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    VentaProductoDatasource,
    VentaProductoRepository,
} from "../../application";
import {
    VentaProductoEntity,
} from "../../domain";

export class VentaProductoRepositoryImpl implements VentaProductoRepository {

    constructor(private readonly datasource: VentaProductoDatasource) { }

    getAll(page?: number, limit?: number): Promise<PaginatedResult<VentaProductoEntity>> {
        return this.datasource.getAll(page, limit);
    }

    getByVentaId(ventaid: number): Promise<VentaProductoEntity[]> {
        return this.datasource.getByVentaId(ventaid);
    }
}
