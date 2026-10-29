import { ProcesarDevolucionDto } from "../../dtos/devolucion/procesar-devolucion.dto";
import { ResultadoDevolucion } from "../../datasources/devolucion.datasource";
import { DevolucionRepository } from "../../repositories/devolucion.repository";

export interface ProcesarDevolucionUseCase {
    execute(dto: ProcesarDevolucionDto): Promise<ResultadoDevolucion>;
}

export class ProcesarDevolucion implements ProcesarDevolucionUseCase {
    constructor(private readonly repository: DevolucionRepository) {}

    execute(dto: ProcesarDevolucionDto): Promise<ResultadoDevolucion> {
        return this.repository.procesar(dto);
    }
}
