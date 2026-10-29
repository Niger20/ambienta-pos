import {PagoEntity} from "../../../domain/entitites/pago.entity";
import {PagoRepository} from "../../repositories/pago.repository";


export interface DeletePagoUseCase {
    execute( id: number ): Promise<PagoEntity>;
}

export class DeletePago implements DeletePagoUseCase {

    constructor(private readonly pagoRepository: PagoRepository) {}

    execute( id: number): Promise<PagoEntity> {
        return this.pagoRepository.delete(id);
    }

}