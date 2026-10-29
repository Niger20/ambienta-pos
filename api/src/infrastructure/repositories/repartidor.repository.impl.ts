import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    CreateRepartidorDto,
    RepartidorDataSource,
    RepartidorRepository,
    UpdateRepartidorDto,
} from "../../application";
import {
    RepartidorEntity,
} from "../../domain";
import {PrismaClient} from "@prisma/client/extension";


export class RepartidorRepositoryImpl implements RepartidorRepository {

    constructor(private readonly datasource: RepartidorDataSource) {}

    create(createRepartidorDto: CreateRepartidorDto): Promise<RepartidorEntity> {
        return this.datasource.create(createRepartidorDto);
    }

    delete(id: number): Promise<RepartidorEntity> {
        return this.datasource.delete(id)
    }

    getAll(page?: number, limit?: number): Promise<PaginatedResult<RepartidorEntity>> {
        return this.datasource.getAll(page, limit);
    }

    getById(id: number): Promise<RepartidorEntity | null> {
        return this.datasource.getById(id);
    }

    update(updateRepartidorDto: UpdateRepartidorDto): Promise<RepartidorEntity | null> {
        return this.datasource.update(updateRepartidorDto);
    }

}