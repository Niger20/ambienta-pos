import { UpdateAbonoDto } from "../../dtos";
import { AbonoEntity } from "../../../domain/entitites/abono.entity";
import { AbonoRepository } from "../../repositories/abono.repository";

export interface UpdateAbonoUseCase {
    execute(dto: UpdateAbonoDto): Promise<AbonoEntity>;
}

export class UpdateAbono implements UpdateAbonoUseCase {
    constructor(private readonly repository: AbonoRepository) {}

    execute(dto: UpdateAbonoDto): Promise<AbonoEntity> {
        return this.repository.update(dto);
    }
}
