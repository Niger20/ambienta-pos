import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreatePeriodoPlanillaDto } from "../../application/dtos/periodo-planilla/create-periodo-planilla.dto";
import { UpdatePeriodoPlanillaDto } from "../../application/dtos/periodo-planilla/update-periodo-planilla.dto";
import { PeriodoPlanillaDatasource } from "../../application/datasources/periodo-planilla.datasource";
import { PeriodoPlanillaEntity } from "../../domain/entitites/periodo-planilla.entity";
import { PeriodoPlanillaRepository } from "../../application/repositories/periodo-planilla.repository";

export class PeriodoPlanillaRepositoryImpl implements PeriodoPlanillaRepository {
    constructor(private readonly datasource: PeriodoPlanillaDatasource) {}

    create(dto: CreatePeriodoPlanillaDto): Promise<PeriodoPlanillaEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number, estado?: string): Promise<PaginatedResult<PeriodoPlanillaEntity>> {
        return this.datasource.getAll(page, limit, estado);
    }

    getById(id: number): Promise<PeriodoPlanillaEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdatePeriodoPlanillaDto): Promise<PeriodoPlanillaEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<PeriodoPlanillaEntity> {
        return this.datasource.delete(id);
    }
}
