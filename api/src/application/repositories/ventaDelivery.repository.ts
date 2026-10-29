import { PaginatedResult } from "../dtos/shared/pagination.dto";
import { VentaDeliveryEntity } from "../../domain/entitites/ventaDelivery.entity";

export abstract class VentaDeliveryRepository {

    abstract getAll(page?: number, limit?: number): Promise<PaginatedResult<VentaDeliveryEntity>>;
    abstract getByVentaId(ventaid: number): Promise<VentaDeliveryEntity[]>;
    abstract getByDeliveryId(deliveryid: number): Promise<VentaDeliveryEntity[]>;
}
