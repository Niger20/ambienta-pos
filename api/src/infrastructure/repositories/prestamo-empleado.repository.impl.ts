import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreatePrestamoEmpleadoDto } from "../../application/dtos/prestamo-empleado/create-prestamo-empleado.dto";
import { UpdatePrestamoEmpleadoDto } from "../../application/dtos/prestamo-empleado/update-prestamo-empleado.dto";
import { PrestamoEmpleadoDatasource } from "../../application/datasources/prestamo-empleado.datasource";
import { PrestamoEmpleadoEntity } from "../../domain/entitites/prestamo-empleado.entity";
import { PrestamoEmpleadoRepository } from "../../application/repositories/prestamo-empleado.repository";
import { CuotaProgramada } from "../../application/datasources/prestamo-empleado.datasource";

export class PrestamoEmpleadoRepositoryImpl implements PrestamoEmpleadoRepository {
    constructor(private readonly datasource: PrestamoEmpleadoDatasource) {}

    create(dto: CreatePrestamoEmpleadoDto, cuotas: CuotaProgramada[]): Promise<PrestamoEmpleadoEntity> {
        return this.datasource.create(dto, cuotas);
    }

    getAll(page?: number, limit?: number, empleadoid?: number, estado?: string): Promise<PaginatedResult<PrestamoEmpleadoEntity>> {
        return this.datasource.getAll(page, limit, empleadoid, estado);
    }

    getById(id: number): Promise<PrestamoEmpleadoEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdatePrestamoEmpleadoDto): Promise<PrestamoEmpleadoEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<PrestamoEmpleadoEntity> {
        return this.datasource.delete(id);
    }
}
