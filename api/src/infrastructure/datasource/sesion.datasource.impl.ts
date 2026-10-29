import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    OpenSesionDto,
    MovimientosCaja,
    SesionDatasource,
} from "../../application";
import {
    SesionEntity,
} from "../../domain";
import prisma from "../../data/postgres";
import { NOTA_CREDITO } from "./helpers/devolucion.helper";

// Los abonos de una venta anulada no cuentan en caja (igual que la venta misma).
const ABONO_VIGENTE = { cuentasporcobrar: { estado: { not: 'ANULADA' } } };

// Las notas de crédito por devolución bajan la deuda pero no son efectivo recibido.
const ABONO_EN_CAJA = { ...ABONO_VIGENTE, metodopago: { not: NOTA_CREDITO } };

export class SesionDatasourceImpl implements SesionDatasource {

    async open(dto: OpenSesionDto): Promise<SesionEntity> {
        const sesion = await prisma.sesiones.create({
            data: {
                usuarioid: dto.usuarioid,
                montoinicial: dto.montoinicial,
                fechainicio: new Date(),
            },
            include: { usuarios: true },
        });

        return SesionEntity.fromObject(sesion);
    }

    async cerrar(id: number, fechafin: Date, montofinalsistema: number, montofinalfisico: number): Promise<SesionEntity> {
        const sesion = await prisma.sesiones.update({
            where: { sesionid: id },
            data: { fechafin, montofinalsistema, montofinalfisico },
            include: { usuarios: true },
        });

        return SesionEntity.fromObject(sesion);
    }

    async getAll(page?: number, limit?: number): Promise<PaginatedResult<SesionEntity>> {
        const isPaginated = limit !== undefined && limit > 0;
        const currentPage = page || 1;
        const pageSize = limit || 25;

        const findOptions: any = {
            include: { usuarios: true },
            orderBy: { fechainicio: 'desc' },
        };
        if (isPaginated) {
            findOptions.skip = (currentPage - 1) * pageSize;
            findOptions.take = pageSize;
        }

        const [total, sesiones] = await Promise.all([
            prisma.sesiones.count(),
            prisma.sesiones.findMany(findOptions),
        ]);

        return {
            data: sesiones.map((item) => SesionEntity.fromObject(item)),
            pagination: {
                page: isPaginated ? currentPage : 1,
                limit: isPaginated ? pageSize : total,
                total,
                totalPages: isPaginated ? Math.ceil(total / pageSize) : 1,
            },
        };
    }

    async getById(id: number): Promise<SesionEntity | null> {
        const sesion = await prisma.sesiones.findFirst({
            where: { sesionid: id },
            include: { usuarios: true },
        });

        if (!sesion) throw 'Sesion no encontrada';

        return SesionEntity.fromObject(sesion);
    }

    async getActive(usuarioid: number): Promise<SesionEntity | null> {
        const sesion = await prisma.sesiones.findFirst({
            where: { usuarioid, fechafin: null },
            include: { usuarios: true },
        });

        return sesion ? SesionEntity.fromObject(sesion) : null;
    }

    // Movimientos que entran o salen del efectivo de la sesión en el rango dado.
    async movimientosDeCaja(sesionid: number, desde: Date, hasta: Date): Promise<MovimientosCaja> {
        const fecha = { gte: desde, lte: hasta };

        const [ventas, compras, abonos, pagos] = await Promise.all([
            prisma.ventas.findMany({
                where: { sesionid, estado: true },
                select: { ventaid: true, total: true },
                orderBy: { fecha: 'asc' },
            }),
            prisma.compras.findMany({
                where: {
                    estado: true,
                    tipocompra: { equals: 'CONTADO', mode: 'insensitive' },
                    metodopago: { equals: 'efectivo', mode: 'insensitive' },
                    fecha,
                },
                select: { compraid: true, total: true },
                orderBy: { fecha: 'asc' },
            }),
            prisma.abonos.findMany({
                where: { ...ABONO_EN_CAJA, fecha },
                select: { abonoid: true, monto: true },
                orderBy: { fecha: 'asc' },
            }),
            prisma.pagos.findMany({
                where: { fecha },
                select: { pagoid: true, monto: true },
                orderBy: { fecha: 'asc' },
            }),
        ]);

        return {
            ventas: ventas.map((v) => ({ id: v.ventaid, total: Number(v.total) })),
            compras: compras.map((c) => ({ id: c.compraid, total: Number(c.total) })),
            abonos: abonos.map((a) => ({ id: a.abonoid, total: Number(a.monto) })),
            pagos: pagos.map((p) => ({ id: p.pagoid, total: Number(p.monto) })),
        };
    }
}
