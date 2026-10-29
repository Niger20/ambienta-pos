import { PaginatedResult } from "../dtos/shared/pagination.dto";
import { SesionEntity } from "../../domain/entitites/sesion.entity";
import { OpenSesionDto } from "../dtos";
import { MovimientosCaja } from "../datasources/sesion.datasource";


export abstract class SesionRepository {

    abstract open(dto: OpenSesionDto): Promise<SesionEntity>;
    abstract cerrar(id: number, fechafin: Date, montofinalsistema: number, montofinalfisico: number): Promise<SesionEntity>;
    abstract getAll(page?: number, limit?: number): Promise<PaginatedResult<SesionEntity>>;
    abstract getById(id: number): Promise<SesionEntity | null>;
    abstract getActive(usuarioid: number): Promise<SesionEntity | null>;
    abstract movimientosDeCaja(sesionid: number, desde: Date, hasta: Date): Promise<MovimientosCaja>;

}
