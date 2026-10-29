import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateTablaTramoIrDto } from "../../application/dtos/tabla-tramo-ir/create-tabla-tramo-ir.dto";
import { UpdateTablaTramoIrDto } from "../../application/dtos/tabla-tramo-ir/update-tabla-tramo-ir.dto";
import { TablaTramoIrDatasource } from "../../application/datasources/tabla-tramo-ir.datasource";
import { TablaTramoIrEntity } from "../../domain/entitites/tabla-tramo-ir.entity";
import { TablaTramoIrRepository } from "../../application/repositories/tabla-tramo-ir.repository";

export class TablaTramoIrRepositoryImpl implements TablaTramoIrRepository {
    constructor(private readonly datasource: TablaTramoIrDatasource) {}

    create(dto: CreateTablaTramoIrDto): Promise<TablaTramoIrEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number, activo?: boolean): Promise<PaginatedResult<TablaTramoIrEntity>> {
        return this.datasource.getAll(page, limit, activo);
    }

    getById(id: number): Promise<TablaTramoIrEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateTablaTramoIrDto): Promise<TablaTramoIrEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<TablaTramoIrEntity> {
        return this.datasource.delete(id);
    }
}
