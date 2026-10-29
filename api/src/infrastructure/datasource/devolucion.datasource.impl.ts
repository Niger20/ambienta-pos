import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateDevolucionDto } from "../../application/dtos/devolucion/create-devolucion.dto";
import { ProcesarDevolucionDto } from "../../application/dtos/devolucion/procesar-devolucion.dto";
import { UpdateDevolucionDto } from "../../application/dtos/devolucion/update-devolucion.dto";
import { DevolucionDatasource, ResultadoDevolucion } from "../../application/datasources/devolucion.datasource";
import { DevolucionEntity } from "../../domain/entitites/devolucion.entity";
import { VentaEntity } from "../../domain/entitites/venta.entity";
import prisma from "../../data/postgres";
import { Prisma } from "../../generated/prisma/client";
import { aumentarStock, descontarStock, registrarMovimiento } from "./helpers/stock.helper";
import { EPSILON, NOTA_CREDITO, round2 } from "./helpers/devolucion.helper";

const INCLUDE = {
    usuarios: true,
    ventaproductos: { include: { productos: true } },
} as const;

// Una devolución toca inventario, deuda del cliente, caja y, en un cambio, una venta nueva:
// todo o nada, en una sola transacción.
const TX_OPTIONS = { maxWait: 10000, timeout: 30000 };

export class DevolucionDatasourceImpl implements DevolucionDatasource {

    // Compatibilidad con el endpoint original (una sola línea, reembolso en efectivo).
    async create(dto: CreateDevolucionDto): Promise<DevolucionEntity> {
        const [error, procesar] = ProcesarDevolucionDto.create({
            ventaid: dto.ventaid,
            usuarioid: dto.usuarioid,
            motivo: dto.motivo,
            lineas: [{ productoid: dto.productoid, cantidad: dto.cantidad }],
            metodopago: 'EFECTIVO',
            fecha: dto.fecha,
        });
        if (error) throw error;
        const resultado = await this.procesar(procesar!);
        return resultado.devoluciones[0];
    }

    async procesar(dto: ProcesarDevolucionDto): Promise<ResultadoDevolucion> {
        return prisma.$transaction(async (tx) => {
            const venta = await tx.ventas.findUnique({ where: { ventaid: dto.ventaid } });
            if (!venta) throw 'La venta especificada no existe';
            if (!venta.estado) throw 'La venta está anulada';
            if (venta.tipoventa === 'COTIZACION') throw 'Una cotización no tiene productos entregados que devolver';

            const usuario = await tx.usuarios.findUnique({ where: { usuarioid: dto.usuarioid } });
            if (!usuario) throw 'El usuario especificado no existe';

            // ── 1. Valorizar lo que se devuelve ─────────────────────────────
            const lineasVenta = await tx.ventaproductos.findMany({
                where: { ventaid: dto.ventaid },
                include: { devoluciones: { select: { cantidad: true, montodevuelto: true } }, productos: true },
            });

            const netoDe = (l: { cantidad: Prisma.Decimal; preciounitario: Prisma.Decimal; descuento: Prisma.Decimal | null; totalproducto: Prisma.Decimal | null }) =>
                Number(l.totalproducto ?? l.cantidad.mul(l.preciounitario).minus(l.descuento ?? 0));
            const subtotal = lineasVenta.reduce((s, l) => s + netoDe(l), 0);
            // El descuento de factura se reparte proporcionalmente entre las líneas.
            const factor = subtotal > 0 ? Math.max(0, 1 - Number(venta.descuentofactura) / subtotal) : 1;

            const items = dto.lineas.map((req) => {
                const linea = lineasVenta.find((l) => l.productoid === req.productoid);
                if (!linea) throw `El producto #${req.productoid} no pertenece a esa venta`;

                const vendida = Number(linea.cantidad);
                const devuelto = linea.devoluciones.reduce((s, d) => s + Number(d.cantidad), 0);
                const disponible = round2(vendida - devuelto);
                if (req.cantidad > disponible + EPSILON) {
                    throw `Solo se pueden devolver ${disponible} unidades de "${linea.productos.nombre}"`;
                }

                const netoLinea = round2(netoDe(linea) * factor);
                const yaDevuelto = linea.devoluciones.reduce((s, d) => s + Number(d.montodevuelto), 0);
                // La última unidad devuelta absorbe el redondeo para que la suma cierre con la línea.
                const monto = Math.abs(req.cantidad - disponible) <= EPSILON
                    ? Math.max(0, round2(netoLinea - yaDevuelto))
                    : round2((netoLinea * req.cantidad) / vendida);

                return { productoid: req.productoid, cantidad: req.cantidad, monto };
            });
            const totalDevuelto = round2(items.reduce((s, i) => s + i.monto, 0));

            // ── 2. Deuda del cliente: primero se descuenta del saldo ────────
            const cuenta = await tx.cuentasporcobrar.findFirst({ where: { ventaid: dto.ventaid, estado: { not: 'ANULADA' } } });
            const restanteInicial = cuenta ? Math.max(0, round2(Number(cuenta.montototal) - Number(cuenta.montopagado ?? 0))) : 0;

            let restante = restanteInicial;
            const reparto = items.map((i) => {
                const acreditado = round2(Math.min(i.monto, restante));
                restante = round2(restante - acreditado);
                return { ...i, acreditado, reembolsado: round2(i.monto - acreditado) };
            });
            const totalAcreditado = round2(reparto.reduce((s, i) => s + i.acreditado, 0));
            const totalReembolsado = round2(totalDevuelto - totalAcreditado);

            // ── 3. Caja: reembolsos y cambios requieren una sesión abierta ──
            const sesion = await tx.sesiones.findFirst({ where: { usuarioid: dto.usuarioid, fechafin: null } });
            if ((totalReembolsado > 0 || dto.tipo === 'CAMBIO') && !sesion) {
                throw 'Debe haber una sesión de caja activa para registrar reembolsos o cambios';
            }
            if (totalReembolsado > 0 && !dto.metodopago) throw 'Indique el método de pago del reembolso';

            // ── 4. Inventario: lo devuelto vuelve al stock ──────────────────
            const motivoStock = dto.tipo === 'CAMBIO' ? 'CAMBIO' : 'DEVOLUCION';
            for (const i of reparto) {
                const stockanterior = await aumentarStock(tx, i.productoid, i.cantidad);
                await registrarMovimiento(tx, {
                    productoid: i.productoid,
                    tipomovimiento: 'INGRESO',
                    cantidad: new Prisma.Decimal(i.cantidad).abs(),
                    stockanterior,
                    motivo: `${motivoStock} VENTA #${dto.ventaid}: ${dto.motivo}`,
                    fecha: dto.fecha,
                });
            }

            // ── 5. Cambio: venta nueva con los productos que se lleva ───────
            let ventacambio: Awaited<ReturnType<typeof tx.ventas.findUniqueOrThrow>> | null = null;
            let totalCambio = 0;
            if (dto.tipo === 'CAMBIO') {
                const ids = dto.cambio.map((c) => c.productoid);
                const productos = await tx.productos.findMany({ where: { productoid: { in: ids } } });
                const lineasCambio = dto.cambio.map((c) => {
                    const producto = productos.find((p) => p.productoid === c.productoid);
                    if (!producto) throw `El producto #${c.productoid} del cambio no existe`;
                    const precio = Number(producto.precioventa);
                    return { ...c, precio, total: round2(precio * c.cantidad) };
                });
                totalCambio = round2(lineasCambio.reduce((s, l) => s + l.total, 0));

                const nueva = await tx.ventas.create({
                    data: {
                        sesionid: sesion!.sesionid,
                        clienteid: venta.clienteid,
                        total: totalCambio,
                        descuentofactura: 0,
                        tipoventa: 'CONTADO',
                        lugarventa: 'NORMAL',
                        tipofactura: venta.tipofactura,
                        fecha: dto.fecha,
                    },
                });

                for (const l of lineasCambio) {
                    await tx.ventaproductos.create({
                        data: { ventaid: nueva.ventaid, productoid: l.productoid, cantidad: l.cantidad, preciounitario: l.precio, descuento: 0 },
                    });
                    const stockanterior = await descontarStock(tx, l.productoid, l.cantidad);
                    const mov = await registrarMovimiento(tx, {
                        productoid: l.productoid,
                        tipomovimiento: 'EGRESO',
                        cantidad: new Prisma.Decimal(l.cantidad).negated(),
                        stockanterior,
                        motivo: `Venta #${nueva.ventaid} (cambio de la Venta #${dto.ventaid})`,
                        fecha: dto.fecha,
                    });
                    await tx.movimientoventas.create({ data: { movimeintoventaid: mov.movimientoid, ventaid: nueva.ventaid } });
                }

                await tx.ventapagos.create({
                    data: {
                        ventaid: nueva.ventaid,
                        metodopago: dto.metodopago!,
                        monto: totalCambio,
                        banco: dto.banco,
                        numerotransferencia: dto.numerotransferencia,
                    },
                });

                ventacambio = await tx.ventas.findUniqueOrThrow({ where: { ventaid: nueva.ventaid }, include: { clientes: true } });
            }

            // ── 6. Asientos: nota de crédito y/o reembolso ──────────────────
            let abonoid: number | null = null;
            let pagoid: number | null = null;

            if (totalAcreditado > 0 && cuenta) {
                const abono = await tx.abonos.create({
                    data: { cuentaid: cuenta.cuentaid, monto: totalAcreditado, metodopago: NOTA_CREDITO, fecha: dto.fecha },
                });
                abonoid = abono.abonoid;
                await tx.cuentasporcobrar.update({
                    where: { cuentaid: cuenta.cuentaid },
                    data: {
                        montopagado: { increment: totalAcreditado },
                        ...(round2(restanteInicial - totalAcreditado) <= EPSILON ? { estado: 'PAGADO' } : {}),
                    },
                });
            }

            if (totalReembolsado > 0) {
                const pago = await tx.pagos.create({
                    data: { monto: totalReembolsado, metodopago: dto.metodopago!.toLowerCase(), fecha: dto.fecha, estado: true },
                });
                pagoid = pago.pagoid;
            }

            // ── 7. Registro de cada devolución ──────────────────────────────
            const devoluciones: DevolucionEntity[] = [];
            for (const i of reparto) {
                const record = await tx.devoluciones.create({
                    data: {
                        ventaid: dto.ventaid,
                        productoid: i.productoid,
                        cantidad: i.cantidad,
                        motivo: dto.motivo,
                        montodevuelto: i.monto,
                        usuarioid: dto.usuarioid,
                        fecha: dto.fecha,
                        tipo: dto.tipo,
                        metodopago: dto.metodopago,
                        banco: dto.banco,
                        numerotransferencia: dto.numerotransferencia,
                        montoacreditado: i.acreditado,
                        montoreembolsado: i.reembolsado,
                        // Solo las líneas con parte en el asiento lo referencian (se comparte uno por operación).
                        abonoid: i.acreditado > 0 ? abonoid : null,
                        pagoid: i.reembolsado > 0 ? pagoid : null,
                        ventacambioid: ventacambio?.ventaid ?? null,
                    },
                    include: INCLUDE,
                });
                devoluciones.push(DevolucionEntity.fromObject(record));
            }

            return {
                devoluciones,
                ventacambio: ventacambio ? VentaEntity.fromObject(ventacambio) : null,
                resumen: { totalDevuelto, totalAcreditado, totalReembolsado, totalCambio },
            };
        }, TX_OPTIONS);
    }

    async getAll(page?: number, limit?: number, ventaid?: number, productoid?: number): Promise<PaginatedResult<DevolucionEntity>> {
        const isPaginated = limit !== undefined && limit > 0;
        const currentPage = page || 1;
        const pageSize = limit || 25;

        const where: any = {};
        if (ventaid) where.ventaid = ventaid;
        if (productoid) where.productoid = productoid;

        const findOptions: any = {
            where,
            include: INCLUDE,
            orderBy: { devolucionid: 'desc' }
        };
        if (isPaginated) {
            findOptions.skip = (currentPage - 1) * pageSize;
            findOptions.take = pageSize;
        }

        const [total, records] = await Promise.all([
            prisma.devoluciones.count({ where }),
            prisma.devoluciones.findMany(findOptions),
        ]);

        return {
            data: (records as any[]).map(r => DevolucionEntity.fromObject(r)),
            pagination: {
                page: isPaginated ? currentPage : 1,
                limit: isPaginated ? pageSize : total,
                total,
                totalPages: isPaginated ? Math.ceil(total / pageSize) : 1,
            }
        };
    }

    async getById(id: number): Promise<DevolucionEntity | null> {
        const record = await prisma.devoluciones.findFirst({
            where: { devolucionid: id },
            include: INCLUDE,
        });
        if (!record) throw 'Devolución no encontrada';
        return DevolucionEntity.fromObject(record);
    }

    // Solo el motivo es editable: cambiar cantidades o montos desajustaría inventario y contabilidad.
    async update(dto: UpdateDevolucionDto): Promise<DevolucionEntity | null> {
        await this.getById(dto.id);
        const updated = await prisma.devoluciones.update({
            where: { devolucionid: dto.id },
            data: dto.motivo != null ? { motivo: dto.motivo } : {},
            include: INCLUDE,
        });
        return DevolucionEntity.fromObject(updated);
    }

    async delete(id: number): Promise<DevolucionEntity> {
        const registro = await prisma.devoluciones.findUnique({ where: { devolucionid: id }, include: { ...INCLUDE, ventacambio: true } });
        if (!registro) throw 'Devolución no encontrada';

        if (registro.ventacambioid && registro.ventacambio?.estado) {
            throw `Esta devolución es parte de un cambio: anule primero la venta del cambio #${registro.ventacambioid}`;
        }

        const acreditado = Number(registro.montoacreditado);
        const reembolsado = Number(registro.montoreembolsado);

        await prisma.$transaction(async (tx) => {
            // Revertir stock dejando rastro en el kardex (el movimiento original no
            // está vinculado a la devolución, así que se compensa con un egreso).
            const stockanterior = await descontarStock(tx, registro.productoid, registro.cantidad);
            await registrarMovimiento(tx, {
                productoid: registro.productoid,
                tipomovimiento: 'EGRESO',
                cantidad: new Prisma.Decimal(registro.cantidad).abs().negated(),
                stockanterior,
                motivo: `Reversión de devolución #${id} (Venta #${registro.ventaid})`,
            });

            // Primero la devolución (referencia al abono/pago), luego sus asientos.
            await tx.devoluciones.delete({ where: { devolucionid: id } });

            // La nota de crédito se comparte por operación: solo se resta la parte de esta línea.
            if (registro.abonoid && acreditado > 0) {
                const abono = await tx.abonos.findUnique({ where: { abonoid: registro.abonoid } });
                if (abono) {
                    const nuevoMonto = round2(Number(abono.monto) - acreditado);
                    if (nuevoMonto <= EPSILON) await tx.abonos.delete({ where: { abonoid: abono.abonoid } });
                    else await tx.abonos.update({ where: { abonoid: abono.abonoid }, data: { monto: nuevoMonto } });

                    const cuenta = await tx.cuentasporcobrar.update({
                        where: { cuentaid: abono.cuentaid },
                        data: { montopagado: { decrement: acreditado } },
                    });
                    // La deuda vuelve a existir: una cuenta que se había saldado deja de estarlo.
                    if (cuenta.estado === 'PAGADO') {
                        const vencida = cuenta.fechavencimiento.getTime() < Date.now();
                        await tx.cuentasporcobrar.update({ where: { cuentaid: cuenta.cuentaid }, data: { estado: vencida ? 'VENCIDO' : 'PENDIENTE' } });
                    }
                }
            }

            if (registro.pagoid && reembolsado > 0) {
                const pago = await tx.pagos.findUnique({ where: { pagoid: registro.pagoid } });
                if (pago) {
                    const nuevoMonto = round2(Number(pago.monto) - reembolsado);
                    if (nuevoMonto <= EPSILON) await tx.pagos.delete({ where: { pagoid: pago.pagoid } });
                    else await tx.pagos.update({ where: { pagoid: pago.pagoid }, data: { monto: nuevoMonto } });
                }
            }
        }, TX_OPTIONS);

        return DevolucionEntity.fromObject(registro);
    }
}
