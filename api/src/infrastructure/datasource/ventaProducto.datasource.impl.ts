import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    VentaProductoDatasource,
} from "../../application";
import {
    VentaProductoEntity,
} from "../../domain";
import prisma from "../../data/postgres";

export class VentaProductoDatasourceImpl implements VentaProductoDatasource {

    async getAll(page?: number, limit?: number): Promise<PaginatedResult<VentaProductoEntity>> {
        const isPaginated = limit !== undefined && limit > 0;
        const currentPage = page || 1;
        const pageSize = limit || 25;

        const findOptions: any = {};
        if (isPaginated) {
            findOptions.skip = (currentPage - 1) * pageSize;
            findOptions.take = pageSize;
        }

        const [total, records] = await Promise.all([
            prisma.ventaproductos.count(),
            prisma.ventaproductos.findMany(findOptions),
        ]);

        return {
            data: records.map((item) => VentaProductoEntity.fromObject(item)),
            pagination: {
                page: isPaginated ? currentPage : 1,
                limit: isPaginated ? pageSize : total,
                total,
                totalPages: isPaginated ? Math.ceil(total / pageSize) : 1,
            },
        };
    }

    async getByVentaId(ventaid: number): Promise<VentaProductoEntity[]> {
        const records = await prisma.ventaproductos.findMany({
            where: { ventaid },
            include: { productos: true },
        });
        return records.map((r) => VentaProductoEntity.fromObject(r));
    }
}
