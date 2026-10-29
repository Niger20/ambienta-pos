import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    CreateCuentaPorPagarDto,
    CuentaPorPagarDatasource,
    CuentaPorPagarRepository,
    UpdateCuentaPorPagarDto,
} from "../../application";
import {
    CuentaPorPagarEntity,
} from "../../domain";

export class CuentaPorPagarRepositoryImpl implements CuentaPorPagarRepository {

    constructor(private readonly datasource: CuentaPorPagarDatasource) { }

    create(dto: CreateCuentaPorPagarDto): Promise<CuentaPorPagarEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number): Promise<PaginatedResult<CuentaPorPagarEntity>> {
        return this.datasource.getAll(page, limit);
    }

    getDeactivated(): Promise<CuentaPorPagarEntity[]> {
        return this.datasource.getDeactivated();
    }

    getById(id: number): Promise<CuentaPorPagarEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateCuentaPorPagarDto): Promise<CuentaPorPagarEntity> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<CuentaPorPagarEntity> {
        return this.datasource.delete(id);
    }
}
