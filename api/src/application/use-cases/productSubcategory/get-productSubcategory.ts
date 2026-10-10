import { ProductSubcategoryEntity } from "../../../domain/entitites/productSubcategory.entity";
import { ProductSubcategoryRepository } from "../../repositories/productSubcategory.repository";
import { PaginatedResult } from "../../dtos/shared/pagination.dto";

export class GetProductSubcategory {
    constructor(private readonly repository: ProductSubcategoryRepository) {}

    execute(page?: number, limit?: number, categoriaid?: number): Promise<PaginatedResult<ProductSubcategoryEntity>> {
        return this.repository.getAll(page, limit, categoriaid);
    }
}
