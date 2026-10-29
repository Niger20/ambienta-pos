import { PaginationDto } from "../../application";
import { Request, Response } from 'express';
import {
    GetVentaDelivery,
    GetByVentaIdVentaDelivery,
    GetByDeliveryIdVentaDelivery,
    VentaDeliveryRepository,
} from "../../application";

export class VentaDeliveryController {

    //* DI
    constructor(
        private readonly repository: VentaDeliveryRepository,
    ) { }

    public getAll = (req: Request, res: Response) => {
        const [error, paginationDto] = PaginationDto.create(req.query);
        if (error) return res.status(400).json({ error });

        new GetVentaDelivery(this.repository)
            .execute(paginationDto!.page, paginationDto!.limit)
            .then((records) => res.json(records))
            .catch((err) => res.status(400).json({ error: err }));
    }

    public getByVentaId = (req: Request, res: Response) => {
        const ventaid = +req.params.ventaid;
        if (isNaN(ventaid)) return res.status(400).json({ error: 'Venta ID invalido' });

        new GetByVentaIdVentaDelivery(this.repository)
            .execute(ventaid)
            .then((records) => res.json(records))
            .catch((err) => res.status(400).json({ error: err }));
    }

    public getByDeliveryId = (req: Request, res: Response) => {
        const deliveryid = +req.params.deliveryid;
        if (isNaN(deliveryid)) return res.status(400).json({ error: 'Delivery ID invalido' });

        new GetByDeliveryIdVentaDelivery(this.repository)
            .execute(deliveryid)
            .then((records) => res.json(records))
            .catch((err) => res.status(400).json({ error: err }));
    }
}
