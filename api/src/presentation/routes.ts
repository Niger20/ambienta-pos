import { Router } from "express";
import { AutorizacionGateway } from "../config/ws.adapter";
import { buildAuthMiddleware } from "../infrastructure/factories/auth.middleware.factory";
import { AuthRoutes } from "./auth/routes";
import { UnidadesMedidaRoutes } from "./unidades-medida/routes";

export class AppRoutes {

    static routes(gateway: AutorizacionGateway): Router {

        const router = Router();
        const authMiddleware = buildAuthMiddleware();

        router.use('/api/auth', AuthRoutes.routes);
        router.use('/api/unidades-medida', [authMiddleware.validateJWT.bind(authMiddleware)], UnidadesMedidaRoutes.routes);

        return router;
    }

}