import { CreateDevolucionDto } from "../dtos/devolucion/create-devolucion.dto";
import { UpdateDevolucionDto } from "../dtos/devolucion/update-devolucion.dto";
import { PaginatedResult } from "../dtos/shared/pagination.dto";
import { DevolucionEntity } from "../../domain/entitites/devolucion.entity";
import { VentaEntity } from "../../domain/entitites/venta.entity";
import { ProcesarDevolucionDto } from "../dtos/devolucion/procesar-devolucion.dto";

export interface ResultadoDevolucion {
    devoluciones: DevolucionEntity[];
    /** Venta que entrega los productos del cambio (solo en tipo CAMBIO). */
    ventacambio: VentaEntity | null;
    resumen: {
        totalDevuelto: number;
        /** Parte aplicada a la deuda del cliente (nota de crédito). */
        totalAcreditado: number;
        /** Parte devuelta al cliente por el método elegido. */
        totalReembolsado: number;
        /** Valor de los productos nuevos entregados en un cambio. */
        totalCambio: number;
    };
}

export abstract class DevolucionDatasource {
    abstract create(dto: CreateDevolucionDto): Promise<DevolucionEntity>;
    abstract procesar(dto: ProcesarDevolucionDto): Promise<ResultadoDevolucion>;
    abstract getAll(page?: number, limit?: number, ventaid?: number, productoid?: number): Promise<PaginatedResult<DevolucionEntity>>;
    abstract getById(id: number): Promise<DevolucionEntity | null>;
    abstract update(dto: UpdateDevolucionDto): Promise<DevolucionEntity | null>;
    abstract delete(id: number): Promise<DevolucionEntity>;
}
