import { SesionEntity } from "../../../domain/entitites/sesion.entity";
import { SesionRepository } from "../../repositories/sesion.repository";
import { CajaService } from "../../services/caja.service";

export interface GetActiveSesionUseCase {
    execute(usuarioid: number): Promise<SesionEntity | null>;
}

export class GetActiveSesion implements GetActiveSesionUseCase {
    constructor(private readonly sesionRepository: SesionRepository) { }

    async execute(usuarioid: number): Promise<SesionEntity | null> {
        const sesion = await this.sesionRepository.getActive(usuarioid);
        if (!sesion) return null;

        // Monto esperado en caja hasta este momento
        const caja = await new CajaService(this.sesionRepository).resumen(sesion, new Date());
        return SesionEntity.fromObject({ ...sesion, montofinalsistema: caja.totalEsperado });
    }
}
