import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    MovimientoInventarioDatasource,
    CreateMovimientoInventarioDto,
} from "../../application";
import {
    MovimientoInventarioEntity,
} from "../../domain";
import prisma from "../../data/postgres";
import { Prisma } from "../../generated/prisma/client";
import { aumentarStock, descontarStock, registrarMovimiento } from "./helpers/stock.helper";


export class MovimientoInventarioDatasourceImpl implements MovimientoInventarioDatasource {

    async create(dto: CreateMovimientoInventarioDto): Promise<MovimientoInventarioEntity> {
        const isIngreso = dto.tipomovimiento === 'INGRESO';
        const cantidad = new Prisma.Decimal(dto.cantidad).abs();

        return prisma.$transaction(async (tx) => {
            // El stock anterior se toma del servidor, nunca del cliente (podía
            // llegar desactualizado o truncado).
            const stockanterior = isIngreso
                ? await aumentarStock(tx, dto.productoid, cantidad)
                : await descontarStock(tx, dto.productoid, cantidad);

            const record = await registrarMovimiento(tx, {
                productoid: dto.productoid,
                tipomovimiento: isIngreso ? 'INGRESO' : 'EGRESO',
                cantidad: isIngreso ? cantidad : cantidad.negated(),
                stockanterior,
                motivo: dto.motivo,
            });

            return MovimientoInventarioEntity.fromObject(record);
        });
    }


    async getAll(page?: number, limit?: number): Promise<PaginatedResult<MovimientoInventarioEntity>> {
        const isPaginated = limit !== undefined && limit > 0;
        const currentPage = page || 1;
        const pageSize = limit || 25;

        const findOptions: any = {
            where: {
                movimientoventas: {
                    none: {
                        ventas: {
                            estado: false
                        }
                    }
                },
                movimientoscompras: {
                    none: {
                        compras: {
                            estado: false
                        }
                    }
                }
            },
            include: {
                productos: true,
                movimientoventas: true,
                movimientoscompras: true,
            },
            orderBy: { fecha: 'desc' },
        };
        if (isPaginated) {
            findOptions.skip = (currentPage - 1) * pageSize;
            findOptions.take = pageSize;
        }

        const [total, records] = await Promise.all([
            prisma.movimientosinventario.count({ where: {
                movimientoventas: {
                    none: {
                        ventas: {
                            estado: false
                        }
                    }
                },
                movimientoscompras: {
                    none: {
                        compras: {
                            estado: false
                        }
                    }
                }
            } }),
            prisma.movimientosinventario.findMany(findOptions),
        ]);

        return {
            data: records.map((item) => MovimientoInventarioEntity.fromObject(item)),
            pagination: {
                page: isPaginated ? currentPage : 1,
                limit: isPaginated ? pageSize : total,
                total,
                totalPages: isPaginated ? Math.ceil(total / pageSize) : 1,
            },
        };
    }

    async getById(id: number): Promise<MovimientoInventarioEntity | null> {
        const record = await prisma.movimientosinventario.findFirst({
            where: { movimientoid: id },
            include: {
                productos: true,
                movimientoventas: true,
                movimientoscompras: true,
            },
        });

        if (!record) throw 'Movimiento de inventario no encontrado';

        return record ? MovimientoInventarioEntity.fromObject(record) : null;
    }

    async getByProductoId(productoid: number): Promise<MovimientoInventarioEntity[]> {
        const records = await prisma.movimientosinventario.findMany({
            where: {
                productoid,
                movimientoventas: {
                    none: {
                        ventas: {
                            estado: false
                        }
                    }
                },
                movimientoscompras: {
                    none: {
                        compras: {
                            estado: false
                        }
                    }
                }
            },
            include: {
                productos: true,
                movimientoventas: true,
                movimientoscompras: true,
            },
            orderBy: { fecha: 'desc' },
        });
        return records.map((r) => MovimientoInventarioEntity.fromObject(r));
    }
}
