import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateUnidadMedidaDto } from "../../application/dtos/unidad-medida/create-unidad-medida.dto";
import { UpdateUnidadMedidaDto } from "../../application/dtos/unidad-medida/update-unidad-medida.dto";
import { UnidadMedidaDatasource } from "../../application/datasources/unidad-medida.datasource";
import { UnidadMedidaEntity } from "../../domain/entitites/unidad-medida.entity";
import { UnidadMedidaRepository } from "../../application/repositories/unidad-medida.repository";

export class UnidadMedidaRepositoryImpl implements UnidadMedidaRepository {
    constructor(private readonly datasource: UnidadMedidaDatasource) {}

    create(dto: CreateUnidadMedidaDto): Promise<UnidadMedidaEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number): Promise<PaginatedResult<UnidadMedidaEntity>> {
        return this.datasource.getAll(page, limit);
    }

    getById(id: number): Promise<UnidadMedidaEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateUnidadMedidaDto): Promise<UnidadMedidaEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<UnidadMedidaEntity> {
        return this.datasource.delete(id);
    }
}
