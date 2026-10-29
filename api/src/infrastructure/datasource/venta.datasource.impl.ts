import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    CheckoutVentaDto,
    CreateVentaDto,
    VentaDatasource,
    UpdateVentaDto,
} from "../../application";
import {
    VentaEntity,
} from "../../domain";
import prisma from "../../data/postgres";
import { Prisma } from "../../generated/prisma/client";
import { aumentarStock, descontarStock, registrarMovimiento } from "./helpers/stock.helper";

export class VentaDatasourceImpl implements VentaDatasource {

    async create(createVentaDto: CreateVentaDto): Promise<VentaEntity> {
        const venta = await prisma.ventas.create({
            data: {
                clienteid: createVentaDto.clienteid,
                sesionid: createVentaDto.sesionid,
                total: createVentaDto.total,
                tipoventa: createVentaDto.tipoventa,
                lugarventa: createVentaDto.lugarventa,
                fecha: createVentaDto.fecha,
                estado: createVentaDto.estado,
                tipofactura: (createVentaDto as any).tipofactura ?? null,
            },
            include: { clientes: true },
        });

        return VentaEntity.fromObject(venta);
    }

    async getAll(page?: number, limit?: number): Promise<PaginatedResult<VentaEntity>> {
        const isPaginated = limit !== undefined && limit > 0;
        const currentPage = page || 1;
        const pageSize = limit || 25;

        const findOptions: any = {
            where: { estado: true },
            include: {
                clientes: true,
            },
            orderBy: {
                fecha: 'desc',
            },
        };
        if (isPaginated) {
            findOptions.skip = (currentPage - 1) * pageSize;
            findOptions.take = pageSize;
        }

        const [total, ventas] = await Promise.all([
            prisma.ventas.count({ where: { estado: true } }),
            prisma.ventas.findMany(findOptions),
        ]);

        return {
            data: ventas.map((venta) => VentaEntity.fromObject(venta)),
            pagination: {
                page: isPaginated ? currentPage : 1,
                limit: isPaginated ? pageSize : total,
                total,
                totalPages: isPaginated ? Math.ceil(total / pageSize) : 1,
            },
        };
    }

    async getDeactivated(): Promise<VentaEntity[]> {
        const ventas = await prisma.ventas.findMany({
            where: { estado: false },
            include: {
                clientes: true,
            },
            orderBy: {
                fecha: 'desc',
            },
        });
        return ventas.map((venta) => VentaEntity.fromObject(venta));
    }

    async getById(id: number): Promise<VentaEntity | null> {
        const venta = await prisma.ventas.findFirst({
            where: { ventaid: id },
            include: {
                clientes: true,
            },
        });

        if (!venta) throw 'Venta no encontrada';

        return VentaEntity.fromObject(venta);
    }

    async update(updateVentaDto: UpdateVentaDto): Promise<VentaEntity | null> {
        await this.getById(updateVentaDto.id);

        return prisma.$transaction(async (tx) => {
            const venta = await tx.ventas.findUniqueOrThrow({ where: { ventaid: updateVentaDto.id } });
            const nuevoTipo = updateVentaDto.tipoventa;

            // Estas transiciones cambiarían el stock sin pasar por la lógica de
            // inventario (anulación / facturación), así que no se permiten aquí.
            if (venta.tipoventa !== 'COTIZACION') {
                if (nuevoTipo === 'COTIZACION') throw 'Una venta facturada no puede volver a ser cotización';
                if (updateVentaDto.estado === false && venta.estado) throw 'Para anular una venta use la opción Anular Venta';
            }

            // Facturar una cotización descuenta el stock; se "reclama" de forma
            // condicional para que un doble clic no lo descuente dos veces.
            if (venta.tipoventa === 'COTIZACION' && nuevoTipo && nuevoTipo !== 'COTIZACION') {
                if (!venta.estado) throw 'La cotización está anulada y no puede facturarse';

                const { count } = await tx.ventas.updateMany({
                    where: { ventaid: updateVentaDto.id, tipoventa: 'COTIZACION', estado: true },
                    data: { tipoventa: nuevoTipo },
                });
                if (count === 0) throw 'La cotización ya fue facturada';

                const lineas = await tx.ventaproductos.findMany({ where: { ventaid: updateVentaDto.id } });
                for (const vp of lineas) {
                    const stockanterior = await descontarStock(tx, vp.productoid, vp.cantidad);
                    const mov = await registrarMovimiento(tx, {
                        productoid: vp.productoid,
                        tipomovimiento: 'EGRESO',
                        cantidad: vp.cantidad.negated(),
                        stockanterior,
                        motivo: `Facturación Cotización #${updateVentaDto.id}`,
                    });
                    await tx.movimientoventas.create({
                        data: { movimeintoventaid: mov.movimientoid, ventaid: updateVentaDto.id },
                    });
                }
            }

            const updated = await tx.ventas.update({
                where: { ventaid: updateVentaDto.id },
                data: updateVentaDto.values,
                include: { clientes: true },
            });

            return VentaEntity.fromObject(updated);
        });
    }

    // Todo el cobro en UNA transacción: si cualquier paso falla (stock
    // insuficiente, pago inválido, etc.) no queda nada guardado y el cajero
    // puede reintentar sin generar ventas duplicadas ni a medias.
    async checkout(dto: CheckoutVentaDto, total: number): Promise<VentaEntity> {
        const venta = await prisma.$transaction(async (tx) => {
            const sesion = await tx.sesiones.findUnique({ where: { sesionid: dto.sesionid } });
            if (!sesion) throw 'Sesión de caja no encontrada';
            if (sesion.fechafin != null) throw 'La sesión de caja está cerrada';

            const esCotizacion = dto.tipoventa === 'COTIZACION';

            const nueva = await tx.ventas.create({
                data: {
                    sesionid: dto.sesionid,
                    clienteid: dto.clienteid,
                    total,
                    descuentofactura: dto.descuentofactura,
                    tipoventa: dto.tipoventa,
                    lugarventa: dto.lugarventa,
                    tipofactura: dto.tipofactura,
                    fecha: new Date(),
                },
            });
            const ventaid = nueva.ventaid;

            for (const linea of dto.lineas) {
                await tx.ventaproductos.create({
                    data: {
                        ventaid,
                        productoid: linea.productoid,
                        cantidad: linea.cantidad,
                        preciounitario: linea.preciounitario,
                        descuento: linea.descuento,
                    },
                });

                if (esCotizacion) continue;

                const cantidad = new Prisma.Decimal(linea.cantidad);
                const stockanterior = await descontarStock(tx, linea.productoid, cantidad);
                const mov = await registrarMovimiento(tx, {
                    productoid: linea.productoid,
                    tipomovimiento: 'EGRESO',
                    cantidad: cantidad.negated(),
                    stockanterior,
                    motivo: `Venta #${ventaid}`,
                });
                await tx.movimientoventas.create({ data: { movimeintoventaid: mov.movimientoid, ventaid } });
            }

            for (const pago of dto.pagos) {
                await tx.ventapagos.create({ data: { ventaid, ...pago } });
            }

            if (dto.tipoventa === 'CREDITO') {
                await tx.cuentasporcobrar.create({
                    data: {
                        ventaid,
                        clienteid: dto.clienteid!,
                        montototal: total,
                        montopagado: 0,
                        fechavencimiento: dto.fechavencimiento!,
                        estado: 'PENDIENTE',
                    },
                });
            }

            if (dto.delivery) {
                const delivery = await tx.deliveries.create({
                    data: { ...dto.delivery, estado: true, fecha: new Date() },
                });
                await tx.ventadelivery.create({ data: { ventaid, deliveryid: delivery.deliveryid } });
            }

            return tx.ventas.findUniqueOrThrow({ where: { ventaid }, include: { clientes: true } });
        });

        return VentaEntity.fromObject(venta);
    }

    async delete(id: number): Promise<VentaEntity> {
        await this.getById(id);

        // Los reembolsos y notas de crédito de sus devoluciones quedarían sin respaldo.
        const devoluciones = await prisma.devoluciones.count({ where: { ventaid: id } });
        if (devoluciones > 0) throw 'La venta tiene devoluciones registradas: elimínelas antes de anularla';

        const updated = await prisma.$transaction(async (tx) => {
            // Se marca como anulada de forma condicional: si dos solicitudes llegan
            // a la vez (o se reintenta), solo una restituye el stock.
            const { count } = await tx.ventas.updateMany({
                where: { ventaid: id, estado: true },
                data: { estado: false },
            });
            if (count === 0) throw 'La venta ya está anulada';

            const venta = await tx.ventas.findUniqueOrThrow({ where: { ventaid: id } });

            if (venta.tipoventa !== 'COTIZACION') {
                const lineas = await tx.ventaproductos.findMany({
                    where: { ventaid: id },
                    include: { devoluciones: { select: { cantidad: true } } },
                });

                for (const vp of lineas) {
                    // Lo ya devuelto volvió al stock en su momento; no se suma dos veces.
                    const devuelto = vp.devoluciones.reduce((s, d) => s.plus(d.cantidad), new Prisma.Decimal(0));
                    const restituir = vp.cantidad.minus(devuelto);
                    if (restituir.gt(0)) await aumentarStock(tx, vp.productoid, restituir);
                }
            }

            await tx.cuentasporcobrar.updateMany({ where: { ventaid: id }, data: { estado: 'ANULADA' } });

            return tx.ventas.findUniqueOrThrow({ where: { ventaid: id }, include: { clientes: true } });
        });

        return VentaEntity.fromObject(updated);
    }
}
