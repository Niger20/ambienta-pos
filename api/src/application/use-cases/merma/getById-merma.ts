import { MermaEntity } from "../../../domain/entitites/merma.entity";
import { MermaRepository } from "../../repositories/merma.repository";

export interface GetByIdMermaUseCase {
    execute(id: number): Promise<MermaEntity | null>;
}

export class GetByIdMerma implements GetByIdMermaUseCase {
    constructor(private readonly repository: MermaRepository) {}

    execute(id: number): Promise<MermaEntity | null> {
        return this.repository.getById(id);
    }
}
