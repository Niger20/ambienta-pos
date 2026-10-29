import { MovimientosCaja } from "../datasources/sesion.datasource";
import { SesionEntity } from "../../domain/entitites/sesion.entity";
import { SesionRepository } from "../repositories/sesion.repository";

const suma = (items: { total: number }[]) => items.reduce((s, i) => s + i.total, 0);

// Regla del efectivo esperado en caja:
//   montoInicial + ventas + abonos − compras al contado en efectivo − pagos
export class CajaService {

    constructor(private readonly sesiones: SesionRepository) { }

    async resumen(sesion: SesionEntity, hasta: Date) {
        const movimientos = await this.sesiones.movimientosDeCaja(sesion.id, sesion.fechainicio || hasta, hasta);
        return CajaService.calcular(sesion.montoinicial, movimientos);
    }

    static calcular(montoInicial: number, mov: MovimientosCaja) {
        const totalVentas = suma(mov.ventas);
        const totalAbonos = suma(mov.abonos);
        const totalCompras = suma(mov.compras);
        const totalPagos = suma(mov.pagos);
        const totalEntradas = totalVentas + totalAbonos;
        const totalSalidas = totalCompras + totalPagos;

        return {
            movimientos: mov,
            montoInicial,
            totalVentas, totalAbonos, totalCompras, totalPagos,
            totalEntradas, totalSalidas,
            totalEsperado: montoInicial + totalEntradas - totalSalidas,
        };
    }
}
