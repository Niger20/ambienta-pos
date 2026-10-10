import { ProductSubcategoryEntity } from "../../../domain/entitites/productSubcategory.entity";
import { ProductSubcategoryRepository } from "../../repositories/productSubcategory.repository";
import { UpdateProductSubcategoryDto } from "../../dtos/subcategoria-productos/update-productSubcategory-dto";

export class UpdateProductSubcategory {
    constructor(private readonly repository: ProductSubcategoryRepository) {}

    execute(dto: UpdateProductSubcategoryDto): Promise<ProductSubcategoryEntity | null> {
        return this.repository.update(dto);
    }
}
