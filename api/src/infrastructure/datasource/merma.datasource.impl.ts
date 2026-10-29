import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { CreateMermaDto } from "../../application/dtos/merma/create-merma.dto";
import { UpdateMermaDto } from "../../application/dtos/merma/update-merma.dto";
import { MermaDatasource } from "../../application/datasources/merma.datasource";
import { MermaEntity } from "../../domain/entitites/merma.entity";
import prisma from "../../data/postgres";
import { Prisma } from "../../generated/prisma/client";
import { aumentarStock, descontarStock, registrarMovimiento } from "./helpers/stock.helper";

export class MermaDatasourceImpl implements MermaDatasource {

    async create(dto: CreateMermaDto): Promise<MermaEntity> {
        const producto = await prisma.productos.findUnique({ where: { productoid: dto.productoid } });
        if (!producto) throw 'El producto especificado no existe';

        const usuario = await prisma.usuarios.findUnique({ where: { usuarioid: dto.usuarioid } });
        if (!usuario) throw 'El usuario especificado no existe';

        if (dto.productodestinoid != null) {
            const productoDestino = await prisma.productos.findUnique({ where: { productoid: dto.productodestinoid } });
            if (!productoDestino) throw 'El producto destino especificado no existe';
        }

        const record = await prisma.$transaction(async (tx) => {
            // Descontar stock del producto de origen (el que se rompió/perdió)
            const stockanteriorOrigen = await descontarStock(tx, dto.productoid, dto.cantidad);
            const mov = await registrarMovimiento(tx, {
                productoid: dto.productoid,
                tipomovimiento: 'MERMA',
                cantidad: new Prisma.Decimal(dto.cantidad).abs().negated(),
                stockanterior: stockanteriorOrigen,
                motivo: `MERMA: ${dto.motivo}`,
                fecha: dto.fecha,
            });

            // Si la merma se convierte en otro producto (ej. cerámica rota),
            // se ingresa el stock correspondiente al producto destino.
            let movIngreso: { movimientoid: number } | null = null;
            if (dto.productodestinoid != null && dto.cantidaddestino != null) {
                const stockanteriorDestino = await aumentarStock(tx, dto.productodestinoid, dto.cantidaddestino);
                movIngreso = await registrarMovimiento(tx, {
                    productoid: dto.productodestinoid,
                    tipomovimiento: 'INGRESO',
                    cantidad: new Prisma.Decimal(dto.cantidaddestino).abs(),
                    stockanterior: stockanteriorDestino,
                    motivo: `Conversión por merma del producto #${dto.productoid}: ${dto.motivo}`,
                    fecha: dto.fecha,
                });
            }

            return tx.mermas.create({
                data: {
                    productoid: dto.productoid,
                    cantidad: dto.cantidad,
                    costounitario: dto.costounitario,
                    motivo: dto.motivo,
                    usuarioid: dto.usuarioid,
                    fecha: dto.fecha,
                    movimientoid: mov.movimientoid,
                    productodestinoid: dto.productodestinoid ?? null,
                    cantidaddestino: dto.cantidaddestino ?? null,
                    movimientoingresoid: movIngreso?.movimientoid ?? null,
                },
                include: { productos: true, usuarios: true, productodestino: true },
            });
        });

        return MermaEntity.fromObject(record);
    }

    async getAll(page?: number, limit?: number, productoid?: number, usuarioid?: number): Promise<PaginatedResult<MermaEntity>> {
        const isPaginated = limit !== undefined && limit > 0;
        const currentPage = page || 1;
        const pageSize = limit || 25;

        const where: any = {};
        if (productoid) where.productoid = productoid;
        if (usuarioid) where.usuarioid = usuarioid;

        const findOptions: any = {
            where,
            include: {
                productos: true,
                usuarios: true,
                productodestino: true,
            },
            orderBy: { mermaid: 'desc' }
        };
        if (isPaginated) {
            findOptions.skip = (currentPage - 1) * pageSize;
            findOptions.take = pageSize;
        }

        const [total, records] = await Promise.all([
            prisma.mermas.count({ where }),
            prisma.mermas.findMany(findOptions),
        ]);

        return {
            data: records.map(r => MermaEntity.fromObject(r)),
            pagination: {
                page: isPaginated ? currentPage : 1,
                limit: isPaginated ? pageSize : total,
                total,
                totalPages: isPaginated ? Math.ceil(total / pageSize) : 1,
            }
        };
    }

    async getById(id: number): Promise<MermaEntity | null> {
        const record = await prisma.mermas.findFirst({
            where: { mermaid: id },
            include: {
                productos: true,
                usuarios: true,
                productodestino: true,
            }
        });
        if (!record) throw 'Merma no encontrada';
        return MermaEntity.fromObject(record);
    }

    async update(dto: UpdateMermaDto): Promise<MermaEntity | null> {
        await this.getById(dto.id);
        const updated = await prisma.mermas.update({
            where: { mermaid: dto.id },
            data: dto.values,
            include: {
                productos: true,
                usuarios: true,
                productodestino: true,
            }
        });
        return MermaEntity.fromObject(updated);
    }

    async delete(id: number): Promise<MermaEntity> {
        const existing = await this.getById(id);
        const deleted = await prisma.$transaction(async (tx) => {
            // Revertir stock del producto de origen
            await aumentarStock(tx, existing!.productoid, existing!.cantidad);

            // Si la merma había convertido stock hacia un producto destino,
            // revertir también ese lado (restar lo que se había ingresado)
            if (existing!.productodestinoid != null && existing!.cantidaddestino != null) {
                await descontarStock(tx, existing!.productodestinoid, existing!.cantidaddestino);
            }

            // La merma se borra ANTES que los movimientos que referencia (FK)
            const mermaEliminada = await tx.mermas.delete({
                where: { mermaid: id },
                include: { productos: true, usuarios: true, productodestino: true },
            });
            if (existing!.movimientoid) {
                await tx.movimientosinventario.deleteMany({ where: { movimientoid: existing!.movimientoid } });
            }
            if (existing!.movimientoingresoid) {
                await tx.movimientosinventario.deleteMany({ where: { movimientoid: existing!.movimientoingresoid } });
            }

            return mermaEliminada;
        });

        return MermaEntity.fromObject(deleted);
    }
}
