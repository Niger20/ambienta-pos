import { Router } from "express";
import { AutorizacionGateway } from "../config/ws.adapter";
import { buildAuthMiddleware } from "../infrastructure/factories/auth.middleware.factory";
import { CategoriaProductoRoutes } from "./categoria-productos/routes";
import { ClientesRoutes } from "./clientes/routes";
import { ProductosRoutes } from "./producto/routes";
import { AuthRoutes } from "./auth/routes";
import { UnidadesMedidaRoutes } from "./unidades-medida/routes";
import { CategoriasClientesRoutes } from "./categorias-clientes/routes";

export class AppRoutes {

    static routes(gateway: AutorizacionGateway): Router {

        const router = Router();
        const authMiddleware = buildAuthMiddleware();

        router.use('/api/categoria-productos', [authMiddleware.validateJWT.bind(authMiddleware)], CategoriaProductoRoutes.routes);
        router.use('/api/clientes', [authMiddleware.validateJWT.bind(authMiddleware)], ClientesRoutes.routes);
        router.use('/api/productos', [authMiddleware.validateJWT.bind(authMiddleware)], ProductosRoutes.routes);
        router.use('/api/auth', AuthRoutes.routes);
        router.use('/api/unidades-medida', [authMiddleware.validateJWT.bind(authMiddleware)], UnidadesMedidaRoutes.routes);
        router.use('/api/categorias-clientes', [authMiddleware.validateJWT.bind(authMiddleware)], CategoriasClientesRoutes.routes);

        return router;
    }

}