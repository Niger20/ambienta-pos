import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    CreateCompraProductoDto,
    CompraProductoDatasource,
} from "../../application";
import {
    CompraProductoEntity,
} from "../../domain";
import prisma from "../../data/postgres";
import { aumentarStock, descontarStock, registrarMovimiento } from "./helpers/stock.helper";
import { costoPromedioPonderado } from "../../application/services/costo-promedio";

export class CompraProductoDatasourceImpl implements CompraProductoDatasource {

    async create(dto: CreateCompraProductoDto): Promise<CompraProductoEntity> {
        return prisma.$transaction(async (tx) => {
            const producto = await tx.productos.findUnique({ where: { productoid: dto.productoid } });
            if (!producto) throw 'Producto no encontrado';

            const compra = await tx.compras.findUnique({ where: { compraid: dto.compraid } });
            if (!compra) throw 'Compra no encontrada';
            if (!compra.estado) throw 'La compra está anulada';

            const preciounitario = dto.preciounitario ?? Number(producto.preciocompra);
            const nuevoCosto = costoPromedioPonderado(
                Number(producto.stockactual || 0),
                Number(producto.preciocompra || 0),
                Number(dto.cantidad),
                Number(preciounitario),
            );

            const record = await tx.comprasproductos.create({
                data: {
                    compraid: dto.compraid,
                    productoid: dto.productoid,
                    cantidad: dto.cantidad,
                    preciounitario,
                    descuento: dto.descuento ?? 0,
                },
                include: { productos: true },
            });

            await tx.productos.update({ where: { productoid: dto.productoid }, data: { preciocompra: nuevoCosto } });
            const stockanterior = await aumentarStock(tx, dto.productoid, dto.cantidad);

            const mov = await registrarMovimiento(tx, {
                productoid: dto.productoid,
                tipomovimiento: 'INGRESO',
                cantidad: dto.cantidad,
                stockanterior,
                motivo: `Compra #${dto.compraid}`,
            });
            await tx.movimientoscompras.create({
                data: { movimientocompraid: mov.movimientoid, compraid: dto.compraid },
            });

            return CompraProductoEntity.fromObject(record);
        });
    }

    async getAll(page?: number, limit?: number): Promise<PaginatedResult<CompraProductoEntity>> {
        const isPaginated = limit !== undefined && limit > 0;
        const currentPage = page || 1;
        const pageSize = limit || 25;

        const findOptions: any = {
            include: { productos: true },
        };
        if (isPaginated) {
            findOptions.skip = (currentPage - 1) * pageSize;
            findOptions.take = pageSize;
        }

        const [total, records] = await Promise.all([
            prisma.comprasproductos.count(),
            prisma.comprasproductos.findMany(findOptions),
        ]);

        return {
            data: records.map((item) => CompraProductoEntity.fromObject(item)),
            pagination: {
                page: isPaginated ? currentPage : 1,
                limit: isPaginated ? pageSize : total,
                total,
                totalPages: isPaginated ? Math.ceil(total / pageSize) : 1,
            },
        };
    }

    async getByCompraId(compraid: number): Promise<CompraProductoEntity[]> {
        const records = await prisma.comprasproductos.findMany({
            where: { compraid },
            include: { productos: true },
        });
        return records.map((r) => CompraProductoEntity.fromObject(r));
    }
}
