import { UpdateVentaDto } from "../../dtos";
import { VentaEntity } from "../../../domain/entitites/venta.entity";
import { VentaRepository } from "../../repositories/venta.repository";

export interface UpdateVentaUseCase {
    execute(dto: UpdateVentaDto): Promise<VentaEntity | null>;
}

export class UpdateVenta implements UpdateVentaUseCase {
    constructor(private readonly repository: VentaRepository) {}

    execute(dto: UpdateVentaDto): Promise<VentaEntity | null> {
        return this.repository.update(dto);
    }
}
