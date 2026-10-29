import { PaginationDto } from "../../application";
import { Request, Response } from 'express';
import {
    GetVentaProducto,
    GetByVentaIdVentaProducto,
    VentaProductoRepository,
} from "../../application";

export class VentaProductoController {

    //* DI
    constructor(
        private readonly repository: VentaProductoRepository,
    ) { }

    public getAll = (req: Request, res: Response) => {
        const [error, paginationDto] = PaginationDto.create(req.query);
        if (error) return res.status(400).json({ error });

        new GetVentaProducto(this.repository)
            .execute(paginationDto!.page, paginationDto!.limit)
            .then((records) => res.json(records))
            .catch((err) => res.status(400).json({ error: err }));
    }

    public getByVentaId = (req: Request, res: Response) => {
        const ventaid = +req.params.ventaid;
        if (isNaN(ventaid)) return res.status(400).json({ error: 'Venta ID invalido' });

        new GetByVentaIdVentaProducto(this.repository)
            .execute(ventaid)
            .then((records) => res.json(records))
            .catch((err) => res.status(400).json({ error: err }));
    }
}
