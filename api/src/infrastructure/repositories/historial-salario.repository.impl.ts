import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateHistorialSalarioDto } from "../../application/dtos/historial-salario/create-historial-salario.dto";
import { UpdateHistorialSalarioDto } from "../../application/dtos/historial-salario/update-historial-salario.dto";
import { HistorialSalarioDatasource } from "../../application/datasources/historial-salario.datasource";
import { HistorialSalarioEntity } from "../../domain/entitites/historial-salario.entity";
import { HistorialSalarioRepository } from "../../application/repositories/historial-salario.repository";

export class HistorialSalarioRepositoryImpl implements HistorialSalarioRepository {
    constructor(private readonly datasource: HistorialSalarioDatasource) {}

    create(dto: CreateHistorialSalarioDto): Promise<HistorialSalarioEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number, empleadoid?: number): Promise<PaginatedResult<HistorialSalarioEntity>> {
        return this.datasource.getAll(page, limit, empleadoid);
    }

    getById(id: number): Promise<HistorialSalarioEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateHistorialSalarioDto): Promise<HistorialSalarioEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<HistorialSalarioEntity> {
        return this.datasource.delete(id);
    }
}
