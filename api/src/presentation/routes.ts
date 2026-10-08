import { Router } from "express";
import { AutorizacionGateway } from "../config/ws.adapter";

export class AppRoutes {

    static routes(gateway: AutorizacionGateway): Router {

        const router = Router();


        return router;
    }

}