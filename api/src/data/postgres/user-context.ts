import { AsyncLocalStorage } from 'node:async_hooks';

// Usuario autenticado de la petición en curso. Lo establece el middleware de
// autenticación y lo lee la capa de datos para que los triggers de auditoría de
// la BD (fn_auditoria, que lee `app.usuario_id`) sepan quién hizo cada cambio.
export const userContext = new AsyncLocalStorage<{ usuarioid: number }>();
