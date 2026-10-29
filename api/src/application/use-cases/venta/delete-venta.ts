import { VentaEntity } from "../../../domain/entitites/venta.entity";
import { VentaRepository } from "../../repositories/venta.repository";

export interface DeleteVentaUseCase {
    execute(id: number): Promise<VentaEntity>;
}

export class DeleteVenta implements DeleteVentaUseCase {
    constructor(private readonly repository: VentaRepository) {}

    execute(id: number): Promise<VentaEntity> {
        return this.repository.delete(id);
    }
}
