import { ProductSubcategoryEntity } from "../../../domain/entitites/productSubcategory.entity";
import { ProductSubcategoryRepository } from "../../repositories/productSubcategory.repository";
import { CreateProductSubcategoryDto } from "../../dtos/subcategoria-productos/create-productSubcategory-dto";

export class CreateProductSubcategory {
    constructor(private readonly repository: ProductSubcategoryRepository) {}

    execute(dto: CreateProductSubcategoryDto): Promise<ProductSubcategoryEntity> {
        return this.repository.create(dto);
    }
}
