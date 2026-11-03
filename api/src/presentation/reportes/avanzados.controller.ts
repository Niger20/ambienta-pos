import { Request, Response } from 'express';
import { hoyLocal, parseRango } from '../../infrastructure/datasource/reportes/helpers';
import type { Rango } from '../../infrastructure/datasource/reportes/helpers';
import { estadoResultados } from '../../infrastructure/datasource/reportes/estado-resultados.report';
import { libroVentas, reporteDevoluciones, topClientes, ventasPorCategoria, ventasPorPeriodo } from '../../infrastructure/datasource/reportes/ventas.reports';
import { antiguedadSaldos, flujoCaja } from '../../infrastructure/datasource/reportes/finanzas.reports';
import { inventarioSinMovimiento, productosPorVencer, reporteMermas, valorizacionInventario } from '../../infrastructure/datasource/reportes/inventario.reports';
import { costoLaboral, pasivoLaboral } from '../../infrastructure/datasource/reportes/rrhh.reports';
import { bitacoraAuditoria } from '../../infrastructure/datasource/reportes/auditoria.report';

// Reportes de gestión: consultas de solo lectura que arman el resultado a partir de
// los datos operativos (ventas, caja, inventario, planilla, auditoría).
export class ReportesAvanzadosController {

    private responder(res: Response, trabajo: Promise<unknown>) {
        trabajo
            .then(resultado => res.json(resultado))
            .catch(err => {
                console.error('[Reportes]', err);
                res.status(400).json({ error: typeof err === 'string' ? err : 'No se pudo generar el reporte' });
            });
    }

    // Ejecuta el reporte con el rango de la consulta, o responde 400 si es inválido.
    private conRango(req: Request, res: Response, generar: (rango: Rango) => Promise<unknown>) {
        const [error, rango] = parseRango(req.query);
        if (error) return res.status(400).json({ error });
        this.responder(res, generar(rango!));
    }

    private entero(valor: unknown, porDefecto: number, minimo = 1, maximo = 3650): number {
        const n = Number(valor);
        return Number.isInteger(n) && n >= minimo && n <= maximo ? n : porDefecto;
    }

    public estadoResultados = (req: Request, res: Response) => this.conRango(req, res, estadoResultados);

    public flujoCaja = (req: Request, res: Response) =>
        this.conRango(req, res, rango => flujoCaja(rango, req.query.agrupar === 'mes' ? 'mes' : 'dia'));

    public antiguedadSaldos = (req: Request, res: Response) => {
        const tipo = req.query.tipo === 'cxp' ? 'cxp' : 'cxc';
        const corte = typeof req.query.fechaCorte === 'string' && !isNaN(Date.parse(req.query.fechaCorte)) ? req.query.fechaCorte.slice(0, 10) : hoyLocal();
        this.responder(res, antiguedadSaldos(tipo, corte));
    };

    public libroVentas = (req: Request, res: Response) => this.conRango(req, res, libroVentas);

    public ventasPorPeriodo = (req: Request, res: Response) => this.conRango(req, res, ventasPorPeriodo);

    public topClientes = (req: Request, res: Response) =>
        this.conRango(req, res, rango => topClientes(rango, this.entero(req.query.limite, 20, 1, 500)));

    public ventasPorCategoria = (req: Request, res: Response) => this.conRango(req, res, ventasPorCategoria);

    public devoluciones = (req: Request, res: Response) => this.conRango(req, res, reporteDevoluciones);

    public productosPorVencer = (req: Request, res: Response) =>
        this.responder(res, productosPorVencer(this.entero(req.query.dias, 60, 1, 730)));

    public valorizacionInventario = (req: Request, res: Response) =>
        this.responder(res, valorizacionInventario(this.entero(req.query.dias, 90, 7, 730)));

    public inventarioSinMovimiento = (req: Request, res: Response) =>
        this.responder(res, inventarioSinMovimiento(this.entero(req.query.dias, 60, 7, 730)));

    public mermas = (req: Request, res: Response) => this.conRango(req, res, reporteMermas);

    public costoLaboral = (req: Request, res: Response) => this.conRango(req, res, costoLaboral);

    public pasivoLaboral = (_req: Request, res: Response) => this.responder(res, pasivoLaboral());

    public bitacora = (req: Request, res: Response) =>
        this.conRango(req, res, rango => bitacoraAuditoria(rango, {
            usuarioid: req.query.usuarioid ? Number(req.query.usuarioid) : undefined,
            tabla: typeof req.query.tabla === 'string' && req.query.tabla ? req.query.tabla : undefined,
            operacion: typeof req.query.operacion === 'string' && req.query.operacion ? req.query.operacion : undefined,
            limite: this.entero(req.query.limite, 300, 1, 2000),
        }));
}
