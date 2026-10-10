import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateCategoriaClienteDto } from "../../application/dtos/categoria-cliente/create-categoria-cliente.dto";
import { UpdateCategoriaClienteDto } from "../../application/dtos/categoria-cliente/update-categoria-cliente.dto";
import { CategoriaClienteDatasource } from "../../application/datasources/categoria-cliente.datasource";
import { CategoriaClienteEntity } from "../../domain/entitites/categoria-cliente.entity";
import { CategoriaClienteRepository } from "../../application/repositories/categoria-cliente.repository";

export class CategoriaClienteRepositoryImpl implements CategoriaClienteRepository {
    constructor(private readonly datasource: CategoriaClienteDatasource) {}

    create(dto: CreateCategoriaClienteDto): Promise<CategoriaClienteEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number): Promise<PaginatedResult<CategoriaClienteEntity>> {
        return this.datasource.getAll(page, limit);
    }

    getById(id: number): Promise<CategoriaClienteEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateCategoriaClienteDto): Promise<CategoriaClienteEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<CategoriaClienteEntity> {
        return this.datasource.delete(id);
    }
}
