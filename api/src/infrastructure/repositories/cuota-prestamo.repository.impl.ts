import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateCuotaPrestamoDto } from "../../application/dtos/cuota-prestamo/create-cuota-prestamo.dto";
import { UpdateCuotaPrestamoDto } from "../../application/dtos/cuota-prestamo/update-cuota-prestamo.dto";
import { CuotaPrestamoDatasource } from "../../application/datasources/cuota-prestamo.datasource";
import { CuotaPrestamoEntity } from "../../domain/entitites/cuota-prestamo.entity";
import { CuotaPrestamoRepository } from "../../application/repositories/cuota-prestamo.repository";

export class CuotaPrestamoRepositoryImpl implements CuotaPrestamoRepository {
    constructor(private readonly datasource: CuotaPrestamoDatasource) {}

    create(dto: CreateCuotaPrestamoDto): Promise<CuotaPrestamoEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number, prestamoid?: number, estado?: string): Promise<PaginatedResult<CuotaPrestamoEntity>> {
        return this.datasource.getAll(page, limit, prestamoid, estado);
    }

    getById(id: number): Promise<CuotaPrestamoEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateCuotaPrestamoDto): Promise<CuotaPrestamoEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<CuotaPrestamoEntity> {
        return this.datasource.delete(id);
    }
}
