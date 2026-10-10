import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { ProductSubcategoryEntity } from "../../domain/entitites/productSubcategory.entity";
import { ProductSubcategoryDataSource } from "../../application/datasources/productSubcategory.datasource";
import { ProductSubcategoryRepository } from "../../application/repositories/productSubcategory.repository";
import { CreateProductSubcategoryDto } from "../../application/dtos/subcategoria-productos/create-productSubcategory-dto";
import { UpdateProductSubcategoryDto } from "../../application/dtos/subcategoria-productos/update-productSubcategory-dto";

export class ProductSubcategoryRepositoryImpl implements ProductSubcategoryRepository {
    constructor(private readonly datasource: ProductSubcategoryDataSource) {}

    create(dto: CreateProductSubcategoryDto): Promise<ProductSubcategoryEntity> {
        return this.datasource.create(dto);
    }

    getAll(page?: number, limit?: number, categoriaid?: number): Promise<PaginatedResult<ProductSubcategoryEntity>> {
        return this.datasource.getAll(page, limit, categoriaid);
    }

    getById(id: number): Promise<ProductSubcategoryEntity | null> {
        return this.datasource.getById(id);
    }

    update(dto: UpdateProductSubcategoryDto): Promise<ProductSubcategoryEntity | null> {
        return this.datasource.update(dto);
    }

    delete(id: number): Promise<ProductSubcategoryEntity> {
        return this.datasource.delete(id);
    }
}
