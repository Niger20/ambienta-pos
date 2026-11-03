import { UtilidadDiariaEntity } from "../../../domain/entitites/reportes/utilidad-diaria.entity";
import { UtilidadProductoEntity } from "../../../domain/entitites/reportes/utilidad-producto.entity";

export abstract class ReportesRepository {
    abstract getUtilidadDiaria(fechaInicio: Date, fechaFin: Date): Promise<UtilidadDiariaEntity>;
    abstract getUtilidadProducto(fechaInicio: Date, fechaFin: Date): Promise<UtilidadProductoEntity[]>;
}
