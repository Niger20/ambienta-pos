import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateAnticipoSalarioDto } from "../../application/dtos/anticipo-salario/create-anticipo-salario.dto";
import { UpdateAnticipoSalarioDto } from "../../application/dtos/anticipo-salario/update-anticipo-salario.dto";
import { AnticipoSalarioDatasource } from "../../application/datasources/anticipo-salario.datasource";
import { AnticipoSalarioEntity } from "../../domain/entitites/anticipo-salario.entity";
import { AnticipoSalarioRepository } from "../../application/repositories/anticipo-salario.repository";

export class AnticipoSalarioRepositoryImpl implements AnticipoSalarioRepository {
    constructor(private readonly datasource: AnticipoSalarioDatasource) {}

    create(dto: CreateAnticipoSalarioDto): Promise<AnticipoSalarioEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number, empleadoid?: number, mes?: number, anio?: number, estado?: string): Promise<PaginatedResult<AnticipoSalarioEntity>> {
        return this.datasource.getAll(page, limit, empleadoid, mes, anio, estado);
    }

    getById(id: number): Promise<AnticipoSalarioEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateAnticipoSalarioDto): Promise<AnticipoSalarioEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<AnticipoSalarioEntity> {
        return this.datasource.delete(id);
    }
}
