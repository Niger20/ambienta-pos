export class CreateProductSubcategoryDto {

    private constructor(
        public readonly categoriaid: number,
        public readonly nombre: string,
        public readonly descripcion?: string | null,
    ) {}

    static create(props: { [key: string]: any }): [string?, CreateProductSubcategoryDto?] {
        const { categoriaid, nombre, descripcion } = props;

        const parsedCategoria = Number(categoriaid);
        if (categoriaid == null || !Number.isInteger(parsedCategoria)) return ['La categoría principal es obligatoria', undefined];
        if (!nombre || typeof nombre !== 'string' || !nombre.trim()) return ['El nombre es obligatorio', undefined];
        if (descripcion != null && typeof descripcion !== 'string') return ['La descripcion debe ser una cadena de texto', undefined];

        return [undefined, new CreateProductSubcategoryDto(parsedCategoria, nombre.trim(), descripcion ? descripcion.trim() : null)];
    }
}
