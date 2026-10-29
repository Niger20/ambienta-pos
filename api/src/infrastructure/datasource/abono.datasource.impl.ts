import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import {
    CreateAbonoDto,
    AbonoDatasource,
    UpdateAbonoDto,
} from "../../application";
import {
    AbonoEntity,
} from "../../domain";
import prisma from "../../data/postgres";
import { NOTA_CREDITO } from "./helpers/devolucion.helper";

// Al anular la venta, sus abonos se conservan en la BD pero dejan de existir
// para el sistema (listados, cierre de caja, etc.).
const ABONO_VIGENTE = { cuentasporcobrar: { estado: { not: 'ANULADA' } } };

export class AbonoDatasourceImpl implements AbonoDatasource {

    async create(dto: CreateAbonoDto): Promise<AbonoEntity> {
        const result = await prisma.$transaction(async (tx) => {
            const cuenta = await tx.cuentasporcobrar.findFirst({ where: { cuentaid: dto.cuentaid } });
            if (!cuenta) throw 'Cuenta por cobrar no encontrada';
            if (cuenta.estado === 'ANULADA') throw 'La cuenta por cobrar está anulada';

            const record = await tx.abonos.create({
                data: {
                    cuentaid: dto.cuentaid,
                    monto: dto.monto,
                    metodopago: dto.metodopago,
                    fecha: dto.fecha,
                },
            });

            await tx.cuentasporcobrar.update({
                where: { cuentaid: dto.cuentaid },
                data: { montopagado: { increment: dto.monto } },
            });

            return record;
        });

        return AbonoEntity.fromObject(result);
    }

    async getAll(page?: number, limit?: number): Promise<PaginatedResult<AbonoEntity>> {
        const isPaginated = limit !== undefined && limit > 0;
        const currentPage = page || 1;
        const pageSize = limit || 25;

        const findOptions: any = { where: ABONO_VIGENTE };
        if (isPaginated) {
            findOptions.skip = (currentPage - 1) * pageSize;
            findOptions.take = pageSize;
        }

        const [total, records] = await Promise.all([
            prisma.abonos.count({ where: ABONO_VIGENTE }),
            prisma.abonos.findMany(findOptions),
        ]);

        return {
            data: records.map((item) => AbonoEntity.fromObject(item)),
            pagination: {
                page: isPaginated ? currentPage : 1,
                limit: isPaginated ? pageSize : total,
                total,
                totalPages: isPaginated ? Math.ceil(total / pageSize) : 1,
            },
        };
    }

    async getById(id: number): Promise<AbonoEntity | null> {
        const record = await prisma.abonos.findFirst({
            where: { abonoid: id, ...ABONO_VIGENTE },
        });

        if (!record) throw 'Abono no encontrado';
        return AbonoEntity.fromObject(record);
    }

    async getByCuentaId(cuentaid: number): Promise<AbonoEntity[]> {
        const records = await prisma.abonos.findMany({
            where: { cuentaid, ...ABONO_VIGENTE },
        });

        return records.map((r) => AbonoEntity.fromObject(r));
    }

    async update(dto: UpdateAbonoDto): Promise<AbonoEntity> {
        const record = await prisma.abonos.findFirst({ where: { abonoid: dto.id, ...ABONO_VIGENTE } });
        if (!record) throw 'Abono no encontrado';
        if (record.metodopago === NOTA_CREDITO) throw 'Es una nota de crédito por devolución: gestiónela desde Devoluciones';

        const result = await prisma.$transaction(async (tx) => {
            if (dto.monto !== undefined && dto.monto !== Number(record.monto)) {
                await tx.cuentasporcobrar.update({
                    where: { cuentaid: record.cuentaid },
                    data: { montopagado: { increment: dto.monto - Number(record.monto) } },
                });
            }

            return tx.abonos.update({ where: { abonoid: dto.id }, data: dto.values });
        });

        return AbonoEntity.fromObject(result);
    }

    async delete(id: number): Promise<AbonoEntity> {
        const record = await prisma.abonos.findFirst({ where: { abonoid: id, ...ABONO_VIGENTE } });
        if (!record) throw 'Abono no encontrado';
        if (record.metodopago === NOTA_CREDITO) throw 'Es una nota de crédito por devolución: elimine la devolución para revertirla';

        const result = await prisma.$transaction(async (tx) => {
            await tx.cuentasporcobrar.update({
                where: { cuentaid: record.cuentaid },
                data: { montopagado: { decrement: Number(record.monto) } },
            });

            return tx.abonos.delete({ where: { abonoid: id } });
        });

        return AbonoEntity.fromObject(result);
    }
}
