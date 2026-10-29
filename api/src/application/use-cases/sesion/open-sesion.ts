import { SesionEntity } from "../../../domain/entitites/sesion.entity";
import { OpenSesionDto } from "../../dtos";
import { SesionRepository } from "../../repositories/sesion.repository";

export interface OpenSesionUseCase {
    execute(dto: OpenSesionDto): Promise<SesionEntity>;
}

export class OpenSesion implements OpenSesionUseCase {
    constructor(private readonly sesionRepository: SesionRepository) { }

    async execute(dto: OpenSesionDto): Promise<SesionEntity> {
        const activa = await this.sesionRepository.getActive(dto.usuarioid);
        if (activa) throw 'El usuario ya tiene una sesion activa. Debe cerrarla antes de abrir una nueva.';

        return this.sesionRepository.open(dto);
    }
}
