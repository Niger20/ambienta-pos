export class UpdateProductSubcategoryDto {

    private constructor(
        public readonly id: number,
        public readonly categoriaid?: number,
        public readonly nombre?: string,
        public readonly descripcion?: string | null,
    ) {}

    get values() {
        const returnObj: { [key: string]: any } = {};
        if (this.categoriaid !== undefined) returnObj.categoriaid = this.categoriaid;
        if (this.nombre) returnObj.nombre = this.nombre;
        if (this.descripcion !== undefined) returnObj.descripcion = this.descripcion;
        return returnObj;
    }

    static create(props: { [key: string]: any }): [string?, UpdateProductSubcategoryDto?] {
        const { id, categoriaid, nombre, descripcion } = props;

        if (!id || isNaN(Number(id))) return ['El id es obligatorio y debe ser un número', undefined];

        let parsedCategoria: number | undefined;
        if (categoriaid != null) {
            parsedCategoria = Number(categoriaid);
            if (!Number.isInteger(parsedCategoria)) return ['La categoría principal debe ser un número válido', undefined];
        }
        if (nombre != null && (typeof nombre !== 'string' || !nombre.trim())) return ['El nombre debe ser una cadena de texto', undefined];
        if (descripcion != null && typeof descripcion !== 'string') return ['La descripcion debe ser una cadena de texto', undefined];

        return [undefined, new UpdateProductSubcategoryDto(
            Number(id),
            parsedCategoria,
            nombre ? nombre.trim() : undefined,
            descripcion === undefined ? undefined : (descripcion ? descripcion.trim() : null),
        )];
    }
}
