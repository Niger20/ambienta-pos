import { Router } from "express";
import { ReportesDatasourceImpl } from "../../infrastructure/datasource/reportes/reportes.datasource.impl";
import { ReportesRepositoryImpl } from "../../infrastructure/repositories/reportes/reportes.repository.impl";
import { ReportesController } from "./controller";
import { ReportesAvanzadosController } from "./avanzados.controller";

export class ReportesRoutes {
    static get routes(): Router {
        const router = Router();

        const datasource = new ReportesDatasourceImpl();
        const repository = new ReportesRepositoryImpl(datasource);

        const controller = new ReportesController(repository);

        router.get('/utilidad-diaria', controller.getUtilidadDiaria);
        router.get('/utilidad-producto', controller.getUtilidadProducto);

        // Reportes de gestión (solo lectura)
        const avanzados = new ReportesAvanzadosController();
        router.get('/estado-resultados', avanzados.estadoResultados);
        router.get('/flujo-caja', avanzados.flujoCaja);
        router.get('/antiguedad-saldos', avanzados.antiguedadSaldos);
        router.get('/libro-ventas', avanzados.libroVentas);
        router.get('/ventas-periodo', avanzados.ventasPorPeriodo);
        router.get('/top-clientes', avanzados.topClientes);
        router.get('/ventas-categoria', avanzados.ventasPorCategoria);
        router.get('/devoluciones', avanzados.devoluciones);
        router.get('/productos-por-vencer', avanzados.productosPorVencer);
        router.get('/valorizacion-inventario', avanzados.valorizacionInventario);
        router.get('/inventario-sin-movimiento', avanzados.inventarioSinMovimiento);
        router.get('/mermas', avanzados.mermas);
        router.get('/costo-laboral', avanzados.costoLaboral);
        router.get('/pasivo-laboral', avanzados.pasivoLaboral);
        router.get('/bitacora', avanzados.bitacora);

        return router;
    }
}
