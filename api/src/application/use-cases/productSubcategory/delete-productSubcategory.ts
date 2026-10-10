import { ProductSubcategoryEntity } from "../../../domain/entitites/productSubcategory.entity";
import { ProductSubcategoryRepository } from "../../repositories/productSubcategory.repository";

export class DeleteProductSubcategory {
    constructor(private readonly repository: ProductSubcategoryRepository) {}

    execute(id: number): Promise<ProductSubcategoryEntity> {
        return this.repository.delete(id);
    }
}
