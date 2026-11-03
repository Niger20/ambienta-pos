import { UpdateCuotaPrestamoDto } from "../../dtos/cuota-prestamo/update-cuota-prestamo.dto";
import { CuotaPrestamoEntity } from "../../../domain/entitites/cuota-prestamo.entity";
import { CuotaPrestamoRepository } from "../../repositories/cuota-prestamo.repository";

export interface UpdateCuotaPrestamoUseCase {
    execute(dto: UpdateCuotaPrestamoDto): Promise<CuotaPrestamoEntity | null>;
}

export class UpdateCuotaPrestamo implements UpdateCuotaPrestamoUseCase {
    constructor(private readonly repository: CuotaPrestamoRepository) {}

    execute(dto: UpdateCuotaPrestamoDto): Promise<CuotaPrestamoEntity | null> {
        return this.repository.update(dto);
    }
}
