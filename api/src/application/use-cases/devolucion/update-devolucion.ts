import { UpdateDevolucionDto } from "../../dtos/devolucion/update-devolucion.dto";
import { DevolucionEntity } from "../../../domain/entitites/devolucion.entity";
import { DevolucionRepository } from "../../repositories/devolucion.repository";

export interface UpdateDevolucionUseCase {
    execute(dto: UpdateDevolucionDto): Promise<DevolucionEntity | null>;
}

export class UpdateDevolucion implements UpdateDevolucionUseCase {
    constructor(private readonly repository: DevolucionRepository) {}

    execute(dto: UpdateDevolucionDto): Promise<DevolucionEntity | null> {
        return this.repository.update(dto);
    }
}
