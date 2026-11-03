import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateFeriadoNacionalDto } from "../../application/dtos/feriado-nacional/create-feriado-nacional.dto";
import { UpdateFeriadoNacionalDto } from "../../application/dtos/feriado-nacional/update-feriado-nacional.dto";
import { FeriadoNacionalDatasource } from "../../application/datasources/feriado-nacional.datasource";
import { FeriadoNacionalEntity } from "../../domain/entitites/feriado-nacional.entity";
import { FeriadoNacionalRepository } from "../../application/repositories/feriado-nacional.repository";

export class FeriadoNacionalRepositoryImpl implements FeriadoNacionalRepository {
    constructor(private readonly datasource: FeriadoNacionalDatasource) {}

    create(dto: CreateFeriadoNacionalDto): Promise<FeriadoNacionalEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number, anio?: number): Promise<PaginatedResult<FeriadoNacionalEntity>> {
        return this.datasource.getAll(page, limit, anio);
    }

    getById(id: number): Promise<FeriadoNacionalEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateFeriadoNacionalDto): Promise<FeriadoNacionalEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<FeriadoNacionalEntity> {
        return this.datasource.delete(id);
    }
}
