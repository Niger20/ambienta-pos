import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    VentaDeliveryDatasource,
    VentaDeliveryRepository,
} from "../../application";
import {
    VentaDeliveryEntity,
} from "../../domain";

export class VentaDeliveryRepositoryImpl implements VentaDeliveryRepository {

    constructor(private readonly datasource: VentaDeliveryDatasource) { }

    getAll(page?: number, limit?: number): Promise<PaginatedResult<VentaDeliveryEntity>> {
        return this.datasource.getAll(page, limit);
    }

    getByVentaId(ventaid: number): Promise<VentaDeliveryEntity[]> {
        return this.datasource.getByVentaId(ventaid);
    }

    getByDeliveryId(deliveryid: number): Promise<VentaDeliveryEntity[]> {
        return this.datasource.getByDeliveryId(deliveryid);
    }
}
