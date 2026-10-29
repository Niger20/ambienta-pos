import { CreateDevolucionDto } from "../dtos/devolucion/create-devolucion.dto";
import { UpdateDevolucionDto } from "../dtos/devolucion/update-devolucion.dto";
import { PaginatedResult } from "../dtos/shared/pagination.dto";
import { DevolucionEntity } from "../../domain/entitites/devolucion.entity";
import { ProcesarDevolucionDto } from "../dtos/devolucion/procesar-devolucion.dto";
import { ResultadoDevolucion } from "../datasources/devolucion.datasource";

export abstract class DevolucionRepository {
    abstract create(dto: CreateDevolucionDto): Promise<DevolucionEntity>;
    abstract procesar(dto: ProcesarDevolucionDto): Promise<ResultadoDevolucion>;
    abstract getAll(page?: number, limit?: number, ventaid?: number, productoid?: number): Promise<PaginatedResult<DevolucionEntity>>;
    abstract getById(id: number): Promise<DevolucionEntity | null>;
    abstract update(dto: UpdateDevolucionDto): Promise<DevolucionEntity | null>;
    abstract delete(id: number): Promise<DevolucionEntity>;
}
