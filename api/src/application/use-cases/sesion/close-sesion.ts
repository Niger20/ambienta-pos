import { SesionEntity } from "../../../domain/entitites/sesion.entity";
import { CloseSesionDto } from "../../dtos";
import { SesionRepository } from "../../repositories/sesion.repository";
import { CajaService } from "../../services/caja.service";

export interface CloseSesionUseCase {
    execute(dto: CloseSesionDto): Promise<SesionEntity>;
}

export class CloseSesion implements CloseSesionUseCase {
    constructor(private readonly sesionRepository: SesionRepository) { }

    async execute(dto: CloseSesionDto): Promise<SesionEntity> {
        const sesion = await this.sesionRepository.getById(dto.id);
        if (sesion!.fechafin != null) throw 'La sesion ya fue cerrada';

        const fechafin = new Date();
        const caja = await new CajaService(this.sesionRepository).resumen(sesion!, fechafin);

        return this.sesionRepository.cerrar(dto.id, fechafin, caja.totalEsperado, dto.montofinalfisico);
    }
}
