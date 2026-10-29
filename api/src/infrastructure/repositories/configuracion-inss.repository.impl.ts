import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateConfiguracionInssDto } from "../../application/dtos/configuracion-inss/create-configuracion-inss.dto";
import { UpdateConfiguracionInssDto } from "../../application/dtos/configuracion-inss/update-configuracion-inss.dto";
import { ConfiguracionInssDatasource } from "../../application/datasources/configuracion-inss.datasource";
import { ConfiguracionInssEntity } from "../../domain/entitites/configuracion-inss.entity";
import { ConfiguracionInssRepository } from "../../application/repositories/configuracion-inss.repository";

export class ConfiguracionInssRepositoryImpl implements ConfiguracionInssRepository {
    constructor(private readonly datasource: ConfiguracionInssDatasource) {}

    create(dto: CreateConfiguracionInssDto): Promise<ConfiguracionInssEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number, activo?: boolean): Promise<PaginatedResult<ConfiguracionInssEntity>> {
        return this.datasource.getAll(page, limit, activo);
    }

    getById(id: number): Promise<ConfiguracionInssEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateConfiguracionInssDto): Promise<ConfiguracionInssEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<ConfiguracionInssEntity> {
        return this.datasource.delete(id);
    }
}
