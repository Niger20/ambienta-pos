import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateAcumuladoIndemnizacionDto } from "../../application/dtos/acumulado-indemnizacion/create-acumulado-indemnizacion.dto";
import { UpdateAcumuladoIndemnizacionDto } from "../../application/dtos/acumulado-indemnizacion/update-acumulado-indemnizacion.dto";
import { AcumuladoIndemnizacionDatasource } from "../../application/datasources/acumulado-indemnizacion.datasource";
import { AcumuladoIndemnizacionEntity } from "../../domain/entitites/acumulado-indemnizacion.entity";
import { AcumuladoIndemnizacionRepository } from "../../application/repositories/acumulado-indemnizacion.repository";

export class AcumuladoIndemnizacionRepositoryImpl implements AcumuladoIndemnizacionRepository {
    constructor(private readonly datasource: AcumuladoIndemnizacionDatasource) {}

    create(dto: CreateAcumuladoIndemnizacionDto): Promise<AcumuladoIndemnizacionEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number, empleadoid?: number, periodoid?: number): Promise<PaginatedResult<AcumuladoIndemnizacionEntity>> {
        return this.datasource.getAll(page, limit, empleadoid, periodoid);
    }

    getById(id: number): Promise<AcumuladoIndemnizacionEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateAcumuladoIndemnizacionDto): Promise<AcumuladoIndemnizacionEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<AcumuladoIndemnizacionEntity> {
        return this.datasource.delete(id);
    }
}
