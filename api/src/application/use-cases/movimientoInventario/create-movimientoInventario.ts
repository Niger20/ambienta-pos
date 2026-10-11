import { MovimientoInventarioEntity } from "../../../domain/entitites/movimientoInventario.entity";
import { CreateMovimientoInventarioDto } from "../../dtos";
import { MovimientoInventarioRepository } from "../../repositories/movimientoInventario.repository";

export interface CreateMovimientoInventarioUseCase {
    execute(dto: CreateMovimientoInventarioDto): Promise<MovimientoInventarioEntity>;
}

// Ajuste manual de inventario: solo entra o saca stock. MERMA y DEVOLUCION
// tienen su propio flujo con sus registros asociados.
export class CreateMovimientoInventario implements CreateMovimientoInventarioUseCase {
    constructor(private readonly repository: MovimientoInventarioRepository) { }

    async execute(dto: CreateMovimientoInventarioDto): Promise<MovimientoInventarioEntity> {
        if (dto.tipomovimiento !== 'INGRESO' && dto.tipomovimiento !== 'EGRESO') {
            throw 'El ajuste manual solo admite INGRESO o EGRESO';
        }
        if (Math.abs(dto.cantidad) <= 0) throw 'La cantidad debe ser mayor a 0';

        return this.repository.create(dto);
    }
}
