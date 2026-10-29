import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    OpenSesionDto,
    MovimientosCaja,
    SesionDatasource,
    SesionRepository,
} from "../../application";
import {
    SesionEntity,
} from "../../domain";


export class SesionRepositoryImpl implements SesionRepository {

    constructor(private readonly datasource: SesionDatasource) { }

    open(dto: OpenSesionDto): Promise<SesionEntity> {
        return this.datasource.open(dto);
    }

    cerrar(id: number, fechafin: Date, montofinalsistema: number, montofinalfisico: number): Promise<SesionEntity> {
        return this.datasource.cerrar(id, fechafin, montofinalsistema, montofinalfisico);
    }

    getAll(page?: number, limit?: number): Promise<PaginatedResult<SesionEntity>> {
        return this.datasource.getAll(page, limit);
    }

    getById(id: number): Promise<SesionEntity | null> {
        return this.datasource.getById(id);
    }

    getActive(usuarioid: number): Promise<SesionEntity | null> {
        return this.datasource.getActive(usuarioid);
    }

    movimientosDeCaja(sesionid: number, desde: Date, hasta: Date): Promise<MovimientosCaja> {
        return this.datasource.movimientosDeCaja(sesionid, desde, hasta);
    }
}
