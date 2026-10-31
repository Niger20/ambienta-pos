import { CreatePrestamoEmpleadoDto } from "../../dtos/prestamo-empleado/create-prestamo-empleado.dto";
import { PrestamoEmpleadoEntity } from "../../../domain/entitites/prestamo-empleado.entity";
import { CuotaProgramada } from "../../datasources/prestamo-empleado.datasource";
import { PrestamoEmpleadoRepository } from "../../repositories/prestamo-empleado.repository";

export interface CreatePrestamoEmpleadoUseCase {
    execute(dto: CreatePrestamoEmpleadoDto): Promise<PrestamoEmpleadoEntity>;
}

export class CreatePrestamoEmpleado implements CreatePrestamoEmpleadoUseCase {
    constructor(private readonly repository: PrestamoEmpleadoRepository) {}

    // El calendario de cuotas (una por mes desde el desembolso) es una regla del
    // préstamo; el repositorio guarda préstamo y cuotas de forma atómica.
    execute(dto: CreatePrestamoEmpleadoDto): Promise<PrestamoEmpleadoEntity> {
        const cuotas: CuotaProgramada[] = [];
        for (let numerocuota = 1; numerocuota <= dto.numerocuotas; numerocuota++) {
            const fechavencimiento = new Date(dto.fechadesembolso);
            fechavencimiento.setMonth(fechavencimiento.getMonth() + numerocuota);
            cuotas.push({ numerocuota, fechavencimiento, montocuota: dto.montocuota });
        }

        return this.repository.create(dto, cuotas);
    }
}
