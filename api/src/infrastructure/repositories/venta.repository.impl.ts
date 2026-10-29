import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    CheckoutVentaDto,
    CreateVentaDto,
    VentaDatasource,
    VentaRepository,
    UpdateVentaDto,
} from "../../application";
import {
    VentaEntity,
} from "../../domain";

export class VentaRepositoryImpl implements VentaRepository {

    constructor(private readonly datasource: VentaDatasource) { }

    create(dto: CreateVentaDto): Promise<VentaEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number): Promise<PaginatedResult<VentaEntity>> {
        return this.datasource.getAll(page, limit);
    }

    getDeactivated(): Promise<VentaEntity[]> {
        return this.datasource.getDeactivated();
    }

    getById(id: number): Promise<VentaEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateVentaDto): Promise<VentaEntity | null> {
        return this.datasource.update(dto);
    }

    checkout(dto: CheckoutVentaDto, total: number): Promise<VentaEntity> {
        return this.datasource.checkout(dto, total);
    }

    delete(id: number): Promise<VentaEntity> {
        return this.datasource.delete(id);
    }
}
