import { Request, Response } from 'express';
import {
    CreateProductSubcategory,
    CreateProductSubcategoryDto,
    DeleteProductSubcategory,
    GetByIdProductSubcategory,
    GetProductSubcategory,
    PaginationDto,
    ProductSubcategoryRepository,
    UpdateProductSubcategory,
    UpdateProductSubcategoryDto,
} from "../../application";

export class ProductsSubcategoryController {
    constructor(private readonly repository: ProductSubcategoryRepository) {}

    public getAll = (req: Request, res: Response) => {
        const [error, paginationDto] = PaginationDto.create(req.query);
        if (error) return res.status(400).json({ error });

        const categoriaid = req.query.categoriaid ? +req.query.categoriaid : undefined;

        new GetProductSubcategory(this.repository)
            .execute(paginationDto!.page, paginationDto!.limit, categoriaid)
            .then(result => res.json(result))
            .catch(err => res.status(400).json({ error: err }));
    };

    public getById = (req: Request, res: Response) => {
        const id = +req.params.id;
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

        new GetByIdProductSubcategory(this.repository)
            .execute(id)
            .then(result => res.json(result))
            .catch(err => res.status(400).json({ error: err }));
    };

    public create = (req: Request, res: Response) => {
        const [error, dto] = CreateProductSubcategoryDto.create(req.body);
        if (error) return res.status(400).json({ error });

        new CreateProductSubcategory(this.repository)
            .execute(dto!)
            .then(result => res.status(201).json(result))
            .catch(err => res.status(400).json({ error: err }));
    };

    public update = (req: Request, res: Response) => {
        const id = +req.params.id;
        const [error, dto] = UpdateProductSubcategoryDto.create({ ...req.body, id });
        if (error) return res.status(400).json({ error });

        new UpdateProductSubcategory(this.repository)
            .execute(dto!)
            .then(result => res.json(result))
            .catch(err => res.status(400).json({ error: err }));
    };

    public delete = (req: Request, res: Response) => {
        const id = +req.params.id;
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

        new DeleteProductSubcategory(this.repository)
            .execute(id)
            .then(result => res.json(result))
            .catch(err => res.status(400).json({ error: err }));
    };
}
