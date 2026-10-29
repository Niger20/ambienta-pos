import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    CreatePagoCuentaPorPagarDto,
    PagoCuentaPorPagarDatasource,
    PagoCuentaPorPagarRepository,
} from "../../application";
import {
    PagoCuentaPorPagarEntity,
} from "../../domain";


export class PagoCuentaPorPagarRepositoryImpl implements PagoCuentaPorPagarRepository {

    constructor(private readonly datasource: PagoCuentaPorPagarDatasource) { }

    create(dto: CreatePagoCuentaPorPagarDto): Promise<PagoCuentaPorPagarEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number): Promise<PaginatedResult<PagoCuentaPorPagarEntity>> {
        return this.datasource.getAll(page, limit);
    }

    getByPagoId(pagoid: number): Promise<PagoCuentaPorPagarEntity[]> {
        return this.datasource.getByPagoId(pagoid);
    }

    getByCuentaPagarId(cuentapagarid: number): Promise<PagoCuentaPorPagarEntity[]> {
        return this.datasource.getByCuentaPagarId(cuentapagarid);
    }

    delete(pagoid: number, cuentapagarid: number): Promise<PagoCuentaPorPagarEntity> {
        return this.datasource.delete(pagoid, cuentapagarid);
    }

}
