import { PaginatedResult } from "../../application/dtos/shared/pagination.dto";
import { ProductSubcategoryDataSource } from "../../application/datasources/productSubcategory.datasource";
import { CreateProductSubcategoryDto } from "../../application/dtos/subcategoria-productos/create-productSubcategory-dto";
import { UpdateProductSubcategoryDto } from "../../application/dtos/subcategoria-productos/update-productSubcategory-dto";
import { ProductSubcategoryEntity } from "../../domain/entitites/productSubcategory.entity";
import prisma from "../../data/postgres";

const INCLUDE = { padre: true } as const;

// Una subcategoría es una fila de categoriasproductos con categoriapadreid.
export class ProductSubcategoryDatasourceImpl implements ProductSubcategoryDataSource {

    // El padre debe existir y ser una categoría principal (solo se permite un nivel).
    private async validarPadre(categoriapadreid: number) {
        const padre = await prisma.categoriasproductos.findUnique({ where: { categoriaid: categoriapadreid } });
        if (!padre) throw 'La categoría principal no existe';
        if (padre.categoriapadreid != null) throw 'Una subcategoría no puede tener subcategorías';
    }

    // El nombre es único dentro de su categoría padre (sin distinguir mayúsculas).
    private async validarNombre(categoriapadreid: number, nombre: string, excluirId?: number) {
        const repetida = await prisma.categoriasproductos.findFirst({
            where: {
                categoriapadreid,
                nombre: { equals: nombre, mode: 'insensitive' },
                ...(excluirId ? { categoriaid: { not: excluirId } } : {}),
            },
        });
        if (repetida) throw 'Ya existe una subcategoría con ese nombre en la categoría';
    }

    private async obtener(id: number) {
        const record = await prisma.categoriasproductos.findFirst({ where: { categoriaid: id, categoriapadreid: { not: null } }, include: INCLUDE });
        if (!record) throw 'Subcategoría no encontrada';
        return record;
    }

    async create(dto: CreateProductSubcategoryDto): Promise<ProductSubcategoryEntity> {
        await this.validarPadre(dto.categoriaid);
        await this.validarNombre(dto.categoriaid, dto.nombre);

        const record = await prisma.categoriasproductos.create({
            data: { categoriapadreid: dto.categoriaid, nombre: dto.nombre, descripcion: dto.descripcion },
            include: INCLUDE,
        });
        return ProductSubcategoryEntity.fromObject(record);
    }

    async getAll(page?: number, limit?: number, categoriaid?: number): Promise<PaginatedResult<ProductSubcategoryEntity>> {
        const isPaginated = limit !== undefined && limit > 0;
        const currentPage = page || 1;
        const pageSize = limit || 25;

        const where = categoriaid ? { categoriapadreid: categoriaid } : { categoriapadreid: { not: null } };
        const findOptions: any = { where, include: INCLUDE, orderBy: [{ categoriapadreid: 'asc' }, { nombre: 'asc' }] };
        if (isPaginated) {
            findOptions.skip = (currentPage - 1) * pageSize;
            findOptions.take = pageSize;
        }

        const [total, records] = await Promise.all([
            prisma.categoriasproductos.count({ where }),
            prisma.categoriasproductos.findMany(findOptions),
        ]);

        return {
            data: (records as any[]).map((item) => ProductSubcategoryEntity.fromObject(item)),
            pagination: {
                page: isPaginated ? currentPage : 1,
                limit: isPaginated ? pageSize : total,
                total,
                totalPages: isPaginated ? Math.ceil(total / pageSize) : 1,
            },
        };
    }

    async getById(id: number): Promise<ProductSubcategoryEntity | null> {
        return ProductSubcategoryEntity.fromObject(await this.obtener(id));
    }

    async update(dto: UpdateProductSubcategoryDto): Promise<ProductSubcategoryEntity | null> {
        const actual = await this.obtener(dto.id);

        const padreId = dto.categoriaid ?? actual.categoriapadreid!;
        if (dto.categoriaid !== undefined && dto.categoriaid !== actual.categoriapadreid) {
            if (dto.categoriaid === dto.id) throw 'Una subcategoría no puede ser su propia categoría principal';
            await this.validarPadre(dto.categoriaid);
        }
        if (dto.nombre !== undefined || dto.categoriaid !== undefined) {
            await this.validarNombre(padreId, dto.nombre ?? actual.nombre, dto.id);
        }

        const { categoriaid, ...resto } = dto.values;
        const record = await prisma.categoriasproductos.update({
            where: { categoriaid: dto.id },
            data: { ...resto, ...(categoriaid !== undefined ? { categoriapadreid: categoriaid } : {}) },
            include: INCLUDE,
        });
        return ProductSubcategoryEntity.fromObject(record);
    }

    async delete(id: number): Promise<ProductSubcategoryEntity> {
        const existente = ProductSubcategoryEntity.fromObject(await this.obtener(id));

        // Los productos se relacionan con la subcategoría como con cualquier categoría.
        const productos = await prisma.productos.count({ where: { categoriaid: id } });
        if (productos > 0) throw `La subcategoría tiene ${productos} producto(s) asignados: reasígnelos antes de eliminarla`;

        await prisma.categoriasproductos.delete({ where: { categoriaid: id } });
        return existente;
    }
}
