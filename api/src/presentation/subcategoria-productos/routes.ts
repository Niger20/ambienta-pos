import { Router } from "express";
import { ProductsSubcategoryController } from "./controller";
import { ProductSubcategoryDatasourceImpl } from "../../infrastructure/datasource/productSubcategory.datasource.impl";
import { ProductSubcategoryRepositoryImpl } from "../../infrastructure/repositories/productSubcategory.repository.impl";

export class SubcategoriaProductoRoutes {
    static get routes(): Router {
        const router = Router();
        const datasource = new ProductSubcategoryDatasourceImpl();
        const repository = new ProductSubcategoryRepositoryImpl(datasource);
        const controller = new ProductsSubcategoryController(repository);

        router.get('/', controller.getAll);
        router.get('/:id', controller.getById);
        router.post('/', controller.create);
        router.put('/:id', controller.update);
        router.delete('/:id', controller.delete);

        return router;
    }
}
