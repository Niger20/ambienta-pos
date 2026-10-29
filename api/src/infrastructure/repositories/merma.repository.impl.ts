import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateMermaDto } from "../../application/dtos/merma/create-merma.dto";
import { UpdateMermaDto } from "../../application/dtos/merma/update-merma.dto";
import { MermaDatasource } from "../../application/datasources/merma.datasource";
import { MermaEntity } from "../../domain/entitites/merma.entity";
import { MermaRepository } from "../../application/repositories/merma.repository";

export class MermaRepositoryImpl implements MermaRepository {
    constructor(private readonly datasource: MermaDatasource) {}

    create(dto: CreateMermaDto): Promise<MermaEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number, productoid?: number, usuarioid?: number): Promise<PaginatedResult<MermaEntity>> {
        return this.datasource.getAll(page, limit, productoid, usuarioid);
    }

    getById(id: number): Promise<MermaEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateMermaDto): Promise<MermaEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<MermaEntity> {
        return this.datasource.delete(id);
    }
}
