import { Router } from "express";
import { AutorizacionGateway } from "../config/ws.adapter";
import { buildAuthMiddleware } from "../infrastructure/factories/auth.middleware.factory";
import { CategoriaProductoRoutes } from "./categoria-productos/routes";
import { SubcategoriaProductoRoutes } from "./subcategoria-productos/routes";
import { ProveedoresRoutes } from "./proveedores/routes";
import { ClientesRoutes } from "./clientes/routes";
import { RepartidorRoutes } from "./repartidor/routes";
import { ProductosRoutes } from "./producto/routes";
import { AuthRoutes } from "./auth/routes";
import { ComprasRoutes } from "./compras/routes";
import { ComprasProductosRoutes } from "./comprasProductos/routes";
import { MovimientosInventarioRoutes } from "./movimientosInventario/routes";
import { MovimientosComprasRoutes } from "./movimientosCompras/routes";
import { UnidadesMedidaRoutes } from "./unidades-medida/routes";
import { CategoriasClientesRoutes } from "./categorias-clientes/routes";
import { CostosAdicionalesComprasRoutes } from "./costos-adicionales-compras/routes";
import { OrdenesCompraRoutes } from "./ordenes-compra/routes";
import { OrdenesCompraProductosRoutes } from "./ordenes-compra-productos/routes";
import { ImagenesProductosRoutes } from "./imagenes-productos/routes";

export class AppRoutes {

    static routes(gateway: AutorizacionGateway): Router {

        const router = Router();
        const authMiddleware = buildAuthMiddleware();

        router.use('/api/categoria-productos', [authMiddleware.validateJWT.bind(authMiddleware)], CategoriaProductoRoutes.routes);
        router.use('/api/subcategoria-productos', [authMiddleware.validateJWT.bind(authMiddleware)], SubcategoriaProductoRoutes.routes);
        router.use('/api/proveedores', [authMiddleware.validateJWT.bind(authMiddleware)], ProveedoresRoutes.routes);
        router.use('/api/clientes', [authMiddleware.validateJWT.bind(authMiddleware)], ClientesRoutes.routes);
        router.use('/api/repartidores', [authMiddleware.validateJWT.bind(authMiddleware)], RepartidorRoutes.routes);
        router.use('/api/productos', [authMiddleware.validateJWT.bind(authMiddleware)], ProductosRoutes.routes);
        router.use('/api/auth', AuthRoutes.routes);
        router.use('/api/compras', [authMiddleware.validateJWT.bind(authMiddleware)], ComprasRoutes.routes);
        router.use('/api/compras-productos', [authMiddleware.validateJWT.bind(authMiddleware)], ComprasProductosRoutes.routes);
        router.use('/api/movimientos-inventario', [authMiddleware.validateJWT.bind(authMiddleware)], MovimientosInventarioRoutes.routes);
        router.use('/api/movimientos-compras', [authMiddleware.validateJWT.bind(authMiddleware)], MovimientosComprasRoutes.routes);
        router.use('/api/unidades-medida', [authMiddleware.validateJWT.bind(authMiddleware)], UnidadesMedidaRoutes.routes);
        router.use('/api/categorias-clientes', [authMiddleware.validateJWT.bind(authMiddleware)], CategoriasClientesRoutes.routes);
        router.use('/api/costos-adicionales-compras', [authMiddleware.validateJWT.bind(authMiddleware)], CostosAdicionalesComprasRoutes.routes);
        router.use('/api/ordenes-compra', [authMiddleware.validateJWT.bind(authMiddleware)], OrdenesCompraRoutes.routes);
        router.use('/api/ordenes-compra-productos', [authMiddleware.validateJWT.bind(authMiddleware)], OrdenesCompraProductosRoutes.routes);
        router.use('/api/imagenes-productos', [authMiddleware.validateJWT.bind(authMiddleware)], ImagenesProductosRoutes.routes);

        return router;
    }

}