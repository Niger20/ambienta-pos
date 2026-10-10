import { PaginatedResult } from "../dtos/shared/pagination.dto";
import { ProductSubcategoryEntity } from "../../domain/entitites/productSubcategory.entity";
import { CreateProductSubcategoryDto } from "../dtos/subcategoria-productos/create-productSubcategory-dto";
import { UpdateProductSubcategoryDto } from "../dtos/subcategoria-productos/update-productSubcategory-dto";

export abstract class ProductSubcategoryRepository {
    abstract create(dto: CreateProductSubcategoryDto): Promise<ProductSubcategoryEntity>;
    abstract getAll(page?: number, limit?: number, categoriaid?: number): Promise<PaginatedResult<ProductSubcategoryEntity>>;
    abstract getById(id: number): Promise<ProductSubcategoryEntity | null>;
    abstract update(dto: UpdateProductSubcategoryDto): Promise<ProductSubcategoryEntity | null>;
    abstract delete(id: number): Promise<ProductSubcategoryEntity>;
}
