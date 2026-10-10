import { ProductSubcategoryEntity } from "../../../domain/entitites/productSubcategory.entity";
import { ProductSubcategoryRepository } from "../../repositories/productSubcategory.repository";

export class GetByIdProductSubcategory {
    constructor(private readonly repository: ProductSubcategoryRepository) {}

    execute(id: number): Promise<ProductSubcategoryEntity | null> {
        return this.repository.getById(id);
    }
}
