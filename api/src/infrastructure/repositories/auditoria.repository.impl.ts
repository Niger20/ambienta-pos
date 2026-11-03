import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateAuditoriaDto } from "../../application/dtos/auditoria/create-auditoria.dto";
import { UpdateAuditoriaDto } from "../../application/dtos/auditoria/update-auditoria.dto";
import { AuditoriaDatasource } from "../../application/datasources/auditoria.datasource";
import { AuditoriaEntity } from "../../domain/entitites/auditoria.entity";
import { AuditoriaRepository } from "../../application/repositories/auditoria.repository";

export class AuditoriaRepositoryImpl implements AuditoriaRepository {
    constructor(private readonly datasource: AuditoriaDatasource) {}

    create(dto: CreateAuditoriaDto): Promise<AuditoriaEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number, tabla?: string, usuarioid?: number): Promise<PaginatedResult<AuditoriaEntity>> {
        return this.datasource.getAll(page, limit, tabla, usuarioid);
    }

    getById(id: number): Promise<AuditoriaEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateAuditoriaDto): Promise<AuditoriaEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<AuditoriaEntity> {
        return this.datasource.delete(id);
    }
}
