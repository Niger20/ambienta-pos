import {PagoEntity} from "../../../domain/entitites/pago.entity";
import {PagoRepository} from "../../repositories/pago.repository";


export interface GetDeactivatedPagoUseCase {
    execute(): Promise<PagoEntity[]>;
}

export class GetDeactivatedPago implements GetDeactivatedPagoUseCase {

    constructor(private readonly pagoRepository: PagoRepository) {}

    execute(): Promise<PagoEntity[]> {
        return this.pagoRepository.getDeactivated();
    }

}