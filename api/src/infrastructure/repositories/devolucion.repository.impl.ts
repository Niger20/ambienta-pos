import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateDevolucionDto } from "../../application/dtos/devolucion/create-devolucion.dto";
import { UpdateDevolucionDto } from "../../application/dtos/devolucion/update-devolucion.dto";
import { DevolucionDatasource, ResultadoDevolucion } from "../../application/datasources/devolucion.datasource";
import { ProcesarDevolucionDto } from "../../application/dtos/devolucion/procesar-devolucion.dto";
import { DevolucionEntity } from "../../domain/entitites/devolucion.entity";
import { DevolucionRepository } from "../../application/repositories/devolucion.repository";

export class DevolucionRepositoryImpl implements DevolucionRepository {
    constructor(private readonly datasource: DevolucionDatasource) {}

    create(dto: CreateDevolucionDto): Promise<DevolucionEntity> {
        return this.datasource.create(dto);
    }

    procesar(dto: ProcesarDevolucionDto): Promise<ResultadoDevolucion> {
        return this.datasource.procesar(dto);
    }

    getAll(page?: number, limit?: number, ventaid?: number, productoid?: number): Promise<PaginatedResult<DevolucionEntity>> {
        return this.datasource.getAll(page, limit, ventaid, productoid);
    }

    getById(id: number): Promise<DevolucionEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateDevolucionDto): Promise<DevolucionEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<DevolucionEntity> {
        return this.datasource.delete(id);
    }
}
