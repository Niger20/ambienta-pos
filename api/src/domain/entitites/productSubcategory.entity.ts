export class ProductSubcategoryEntity {

    constructor(
        public readonly id: number,
        public readonly categoriaid: number,
        public readonly name: string,
        public readonly description?: string | null,
        public readonly categorianombre?: string | null,
    ) { }

    public static fromObject(object: { [key: string]: any }): ProductSubcategoryEntity {
        const id = object.categoriaid ?? object.id;
        const name = object.name ?? object.nombre;
        const description = object.description ?? object.descripcion ?? null;
        // La categoría principal es el padre de la fila.
        const categoriaid = object.categoriapadreid ?? object.parentid;
        const categorianombre = object.padre?.nombre ?? object.categorianombre ?? null;

        if (!id) throw 'ID is required';
        if (!name) throw 'Name is required';
        if (!categoriaid) throw 'Category is required';

        return new ProductSubcategoryEntity(Number(id), Number(categoriaid), name, description, categorianombre);
    }
}
