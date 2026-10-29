import { PaginatedResult } from "../dtos/shared/pagination.dto";
import { VentaEntity } from "../../domain/entitites/venta.entity";
import { CheckoutVentaDto, CreateVentaDto, UpdateVentaDto } from "../dtos";

export abstract class VentaDatasource {

    abstract create(dto: CreateVentaDto): Promise<VentaEntity>;
    abstract checkout(dto: CheckoutVentaDto, total: number): Promise<VentaEntity>;
    abstract getAll(page?: number, limit?: number): Promise<PaginatedResult<VentaEntity>>;
    abstract getDeactivated(): Promise<VentaEntity[]>;
    abstract getById(id: number): Promise<VentaEntity | null>;
    abstract update(dto: UpdateVentaDto): Promise<VentaEntity | null>;
    abstract delete(id: number): Promise<VentaEntity>;
}
