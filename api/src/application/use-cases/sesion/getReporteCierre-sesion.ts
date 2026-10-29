import { SesionRepository } from "../../repositories/sesion.repository";
import { CajaService } from "../../services/caja.service";

export interface GetReporteCierreSesionUseCase {
    execute(id: number): Promise<any>;
}

export class GetReporteCierreSesion implements GetReporteCierreSesionUseCase {
    constructor(private readonly sesionRepository: SesionRepository) { }

    async execute(id: number): Promise<any> {
        const sesion = await this.sesionRepository.getById(id);
        if (sesion!.fechafin != null) throw 'La sesion ya fue cerrada';

        const caja = await new CajaService(this.sesionRepository).resumen(sesion!, new Date());
        const { ventas, abonos, compras, pagos } = caja.movimientos;

        return {
            sesionid: sesion!.id,
            nombreusuario: sesion!.nombreusuario || '',
            fechainicio: sesion!.fechainicio,
            montoinicial: caja.montoInicial,
            entradas: {
                ventas,
                abonos,
                totalVentas: caja.totalVentas,
                totalAbonos: caja.totalAbonos,
                total: caja.totalEntradas,
            },
            salidas: {
                compras,
                pagos,
                totalCompras: caja.totalCompras,
                totalPagos: caja.totalPagos,
                total: caja.totalSalidas,
            },
            totalEsperado: caja.totalEsperado,
        };
    }
}
