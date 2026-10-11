# Ambienta POS — API REST

Backend en desarrollo de Ambienta POS, construido con Node.js, TypeScript, Express y Prisma sobre PostgreSQL. Estado revisado el **11 de octubre de 2026**, con el código del commit `162d059` como referencia.

## Funcionalidades actuales

- Autenticación JWT y administración de usuarios.
- CRUD de productos, categorías, subcategorías, unidades de medida, clientes, categorías de clientes y proveedores.
- Búsqueda de productos por nombre y código de barras.
- Compras: cabeceras, líneas, edición, anulación y propuestas de reposición.
- Órdenes de compra: CRUD de cabeceras y productos, con filtros por proveedor, estado y orden.
- Costos adicionales de compras: CRUD de conceptos y montos, con filtro por compra.
- Registro de líneas de compra con costo promedio ponderado, incremento de stock y movimiento asociado dentro de una transacción.
- Ajustes de stock al editar líneas de compra; anulación que retira las cantidades compradas y anula cuentas por pagar asociadas. Si no hay stock suficiente, la transacción se rechaza.
- Movimientos de inventario manuales y consulta por producto; relaciones entre movimientos y compras.
- Gateway WebSocket de autorizaciones con suscripciones y métodos de notificación. Las rutas REST de autorizaciones todavía no están implementadas.

## Tecnologías y arquitectura

| Tecnología | Versión declarada / configuración |
| --- | --- |
| Node.js | >= 20.19; Docker usa `node:22-alpine` |
| TypeScript | ^5.9.3 |
| Express | ^5.2.1 |
| Prisma y adaptador PostgreSQL | ^7.3.0 |
| PostgreSQL | Imagen `postgres:15` en Docker Compose |
| bcrypt / jsonwebtoken | ^6.0.0 / ^9.0.3 |
| ws | ^8.19.0 |
| Helmet / express-rate-limit / CORS | ^8.1.0 / ^8.3.1 / ^2.8.6 |

```text
api/
├── prisma/schema.prisma
├── prisma.config.ts
├── src/
│   ├── app.ts
│   ├── domain/             # Entidades (entitites/) y enums
│   ├── application/        # DTOs, casos de uso, servicios y contratos
│   ├── infrastructure/     # Datasources/repositories, auth, seguridad y WebSocket
│   ├── presentation/       # Rutas, controladores y servidor HTTP
│   ├── data/postgres/      # Prisma singleton y contexto de auditoría
│   └── config/             # Entorno y reexports de adaptadores
├── Dockerfile
├── docker-compose.yml
└── package.json
```

Flujo habitual: `ruta → controlador → caso de uso → repositorio → datasource → Prisma → PostgreSQL`. Las transacciones viven en los datasources. El cliente Prisma se genera en `src/generated/prisma/`.

## Variables de entorno

Crea `.env` en **`api/`**, antes de instalar dependencias:

```dotenv
PORT=3000
PUBLIC_PATH=public
JWT_SEED=reemplazar_por_un_secreto_largo_y_aleatorio
POSTGRES_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/ambienta_pos

# Opcional: orígenes adicionales separados por comas
ALLOWED_ORIGINS=http://localhost:5173

# Para Docker Compose
POSTGRES_USER=postgres
POSTGRES_PASSWORD=TU_PASSWORD
POSTGRES_DB=ambienta_pos
```

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP obligatorio. |
| `PUBLIC_PATH` | Carpeta de archivos estáticos; valor predeterminado `public`, relativo al directorio de ejecución. |
| `JWT_SEED` | Secreto obligatorio para firmar y verificar JWT. |
| `POSTGRES_URL` | Conexión usada tanto por Prisma CLI como por la aplicación. |
| `ALLOWED_ORIGINS` | Amplía la lista CORS del adaptador. |
| `POSTGRES_USER` | Usuario de PostgreSQL en Compose; predeterminado `postgres`. |
| `POSTGRES_PASSWORD` | Contraseña obligatoria para Compose. |
| `POSTGRES_DB` | Base de datos en Compose; predeterminado `lacatracha` si se omite. |

`DATABASE_URL` no se utiliza en la configuración actual. La plantilla local `.env.template`, si está disponible, solo contiene `PORT`, `PUBLIC_PATH` y `JWT_SEED`; la conexión PostgreSQL debe añadirse. No está versionada actualmente.

## Instalación y ejecución

Desde la raíz del repositorio:

```bash
cd api
# Crear y configurar .env como se indica arriba
npm ci
npm run dev
```

Prerrequisitos: Node.js >= 20.19, npm y una base PostgreSQL preparada con un esquema compatible. La API queda disponible en `http://localhost:3000/api`.

### Preparación de la base de datos

El repositorio contiene `prisma/schema.prisma`, pero **no incluye migraciones, seed ni scripts SQL de inicialización**. `npm ci` genera el cliente Prisma; no prepara PostgreSQL. `prisma migrate deploy` no puede reconstruir la base con el contenido versionado actual.

Para una instalación completa se necesita una base ya preparada o restaurar un respaldo/SQL compatible obtenido por separado. El esquema contiene campos calculados mediante expresiones SQL y referencias a restricciones adicionales; también hay dependencias de funciones y triggers que deben existir en PostgreSQL:

- `fn_recalcular_stock_minimo_global()` para recalcular el stock mínimo.
- Triggers de auditoría que lean `app.usuario_id`, si se quiere registrar el usuario de cada operación. La aplicación propaga ese contexto, pero no incluye la creación de los triggers.

El primer usuario debe provisionarse por separado con una contraseña hasheada compatible con bcrypt. No hay seed ni ruta pública de registro para crear ese usuario inicial.

### Scripts disponibles

Todos se ejecutan desde `api/`.

| Comando | Efecto |
| --- | --- |
| `npm run dev` | Ejecuta `src/app.ts` con recarga mediante ts-node-dev. |
| `npm run prisma:generate` | Genera el cliente Prisma. |
| `npm run build` | Genera Prisma, limpia `dist/` y compila TypeScript. |
| `npm start` | Ejecuta `dist/app.js`; requiere compilación previa. |
| `postinstall` | Genera Prisma automáticamente al instalar. |

No hay scripts de pruebas ni lint definidos en `package.json`.

## Docker

Desde `api/`, con `.env` configurado:

```bash
# Solo PostgreSQL
docker compose up -d postgres-db

# Aplicación y base de datos
docker compose up -d --build

# Consultar logs
docker compose logs -f

# Detener servicios
docker compose down
```

Compose levanta `postgres-db` en el puerto 5432 y `la-catracha-app` en el 3000. Los nombres `la-catracha-app` y el valor predeterminado `lacatracha` son nombres heredados presentes en la configuración. La base se conserva en el volumen `postgres-data`.

La aplicación recibe `POSTGRES_URL` con el host interno `postgres-db`. Compose fija `PORT=3000`, `PUBLIC_PATH=public` y `NODE_ENV=production`; exige `POSTGRES_PASSWORD` y `JWT_SEED`. La base recién creada queda vacía: debe prepararse por separado antes de usar las rutas que consultan datos. El arranque del contenedor no ejecuta migraciones ni espera a que PostgreSQL esté listo mediante un healthcheck.

El servidor puede servir un frontend externo en `public/`, con fallback a `index.html` para rutas fuera de `/api`. No se incluye ese frontend en el repositorio.

## Autenticación y seguridad

Solo `POST /api/auth/login` es público entre los endpoints HTTP implementados. Las demás rutas requieren:

```http
Authorization: Bearer <token>
```

Ejemplo de cuerpo de login:

```json
{
  "nombreusuario": "usuario_existente",
  "contrasena": "su_contrasena"
}
```

Los JWT expiran a las 8 horas por defecto. El middleware valida el token y busca el usuario en la base. Los roles definidos son `administrador`, `empleado` e `invitado`, pero **no hay restricciones por rol aplicadas a las rutas actuales**; el registro de usuarios también requiere JWT.

El servidor usa Helmet, CORS, un límite de cuerpo de 1 MB y un límite de 10 intentos de login por IP cada 15 minutos. Existe un adaptador de límite global, pero no está aplicado en el servidor.

## Rutas HTTP disponibles

### Usuarios

| Método | Ruta | Acceso |
| --- | --- | --- |
| POST | `/api/auth/login` | Público |
| POST | `/api/auth/register` | JWT |
| GET | `/api/auth/getUser` | JWT |
| PUT | `/api/auth/updateUser/:id` | JWT |
| DELETE | `/api/auth/deleteUser/:id` | JWT |

### Catálogos, clientes y proveedores

Cada prefijo de esta tabla ofrece `GET /`, `GET /:id`, `POST /`, `PUT /:id` y `DELETE /:id`:

| Prefijo | Recurso |
| --- | --- |
| `/api/categoria-productos` | Categorías de productos |
| `/api/subcategoria-productos` | Subcategorías; se almacenan como categorías con padre |
| `/api/unidades-medida` | Unidades de medida |
| `/api/clientes` | Clientes |
| `/api/categorias-clientes` | Categorías de clientes |
| `/api/proveedores` | Proveedores |
| `/api/productos` | Productos |

Rutas adicionales de productos:

| Método | Ruta | Comportamiento |
| --- | --- | --- |
| GET | `/api/productos/search?q=texto` | Búsqueda por nombre, sin distinguir mayúsculas; hasta 20 resultados. |
| GET | `/api/productos/barcode/:codigobarra` | Búsqueda por código de barras. |
| GET | `/api/productos/deactivated` | Actualmente devuelve `[]`; no hay desactivación implementada. |
| POST | `/api/productos/recalculate-stock-minimo` | Ejecuta la función SQL de recálculo. |

`DELETE /api/productos/:id` elimina físicamente el producto y rechaza la operación si tiene registros vinculados.

### Compras y líneas

| Método | Ruta | Comportamiento |
| --- | --- | --- |
| GET | `/api/compras` | Listar compras activas. |
| GET | `/api/compras/deactivated` | Listar compras anuladas. |
| GET | `/api/compras/propuesta-global` | Propuesta global de reposición con prioridades e inversión estimada. |
| GET | `/api/compras/propuesta/:proveedorId` | Propuesta de reposición por proveedor. |
| GET | `/api/compras/:id` | Consultar una compra. |
| POST | `/api/compras` | Crear la cabecera de compra. |
| PUT | `/api/compras/:id` | Editar cabecera y, si se envían, líneas y costos adicionales. |
| DELETE | `/api/compras/:id` | Anular y retirar el stock comprado. |
| GET | `/api/compras-productos` | Listar líneas de compras. |
| GET | `/api/compras-productos/compra/:compraid` | Consultar líneas por compra. |
| POST | `/api/compras-productos` | Añadir una línea y actualizar costo/stock/movimiento. |

Las propuestas usan ventas activas de las últimas tres semanas con pesos 0.5, 0.3 y 0.2. La cantidad sugerida es `max(0, ceil(promedio ponderado + stock mínimo - stock actual))`. Requieren datos históricos de ventas, aunque el módulo HTTP de ventas todavía no está implementado.

### Órdenes de compra y sus productos

| Método | Ruta | Comportamiento |
| --- | --- | --- |
| GET | `/api/ordenes-compra` | Listar órdenes con paginación y filtros opcionales `proveedorid` y `estado`. |
| GET | `/api/ordenes-compra/:id` | Consultar cabecera, nombre del proveedor y productos de la orden. |
| POST | `/api/ordenes-compra` | Crear cabecera para un proveedor existente. |
| PUT | `/api/ordenes-compra/:id` | Editar proveedor, estado y fechas. |
| DELETE | `/api/ordenes-compra/:id` | Eliminar la orden y sus líneas dentro de una transacción. |
| GET | `/api/ordenes-compra-productos` | Listar líneas con paginación y filtro opcional `ordencompraid`. |
| GET | `/api/ordenes-compra-productos/:ordencompraid/:productoid` | Consultar una línea por su clave compuesta. |
| POST | `/api/ordenes-compra-productos` | Añadir un producto a una orden existente. |
| PUT | `/api/ordenes-compra-productos/:ordencompraid/:productoid` | Editar cantidad ordenada y precio unitario. |
| DELETE | `/api/ordenes-compra-productos/:ordencompraid/:productoid` | Eliminar una línea de la orden. |

La cabecera recibe `proveedorid` y, opcionalmente, `estado`, `fechaorden` y `fechaesperada`. Por defecto usa estado `PENDIENTE` y la fecha actual; el estado recibido se normaliza a mayúsculas. El filtro `estado` no distingue mayúsculas. La respuesta identifica la orden con `id` e incluye `proveedornombre` y `productos`.

Las líneas reciben `ordencompraid`, `productoid`, `cantidadordenada` mayor que cero y `preciounitario` mayor o igual que cero. Solo puede existir una línea por producto en cada orden, según la clave compuesta del esquema.

Crear o editar órdenes y líneas no modifica stock ni genera movimientos de inventario. Aunque el esquema de `compras` incluye `ordencompraid`, las rutas actuales de compras no exponen su asignación ni una operación de recepción/conversión automática. La eliminación de una orden está sujeta a las relaciones existentes con compras.

### Costos adicionales de compras

| Método | Ruta | Comportamiento |
| --- | --- | --- |
| GET | `/api/costos-adicionales-compras` | Listar costos con paginación y filtro opcional `compraid`. |
| GET | `/api/costos-adicionales-compras/:id` | Consultar un costo adicional. |
| POST | `/api/costos-adicionales-compras` | Crear un costo para una compra existente. |
| PUT | `/api/costos-adicionales-compras/:id` | Editar compra asociada, concepto y monto. |
| DELETE | `/api/costos-adicionales-compras/:id` | Eliminar un costo adicional. |

La creación recibe `compraid`, `concepto` y `monto` mayor o igual que cero. Estas rutas solo guardan los registros de costos: no recalculan el total de la compra, las cuentas por pagar ni el costo promedio de los productos. La edición de compras también permite reemplazar sus costos mediante `costosAdicionales`.

### Inventario y movimientos de compras

| Método | Ruta | Comportamiento |
| --- | --- | --- |
| GET | `/api/movimientos-inventario` | Listar movimientos, excluyendo los vinculados a compras o ventas anuladas. |
| GET | `/api/movimientos-inventario/producto/:productoid` | Historial por producto. |
| GET | `/api/movimientos-inventario/:id` | Consultar un movimiento. |
| POST | `/api/movimientos-inventario` | Registrar un ingreso/egreso y modificar stock en una transacción. |
| GET | `/api/movimientos-compras` | Listar relaciones entre movimientos y compras. |
| GET | `/api/movimientos-compras/movimiento/:movimientocompraid` | Consultar relaciones por movimiento. |
| GET | `/api/movimientos-compras/compra/:compraid` | Consultar relaciones por compra. |
| POST | `/api/movimientos-compras` | Crear una relación. |
| DELETE | `/api/movimientos-compras/:movimientocompraid/:compraid` | Eliminar una relación. |

El stock anterior se obtiene en el servidor. Los egresos usan un decremento condicionado a stock suficiente para evitar saldos negativos. Eliminar una relación movimiento-compra no equivale a revertir stock.

### Paginación

Los listados que usan `PaginationDto` aceptan `?page=1&limit=25`; esos son los valores predeterminados. `limit=0` desactiva la paginación. Las respuestas paginadas contienen `data` y `pagination` (`page`, `limit`, `total`, `totalPages`). Las consultas por ID y los listados especiales pueden tener otro formato.

## WebSocket de autorizaciones

Endpoint: `ws://localhost:3000/ws/autorizaciones`.

| Mensaje del cliente | Respuesta / efecto |
| --- | --- |
| `{"type":"subscribe_admin"}` | Suscribe la conexión y responde `subscribed` con rol `admin`. |
| `{"type":"subscribe_empleado","autorizacionid":1}` | Suscribe la conexión a una autorización y responde `subscribed`. |
| `{"type":"ping"}` | Responde `{"type":"pong"}`. |

El gateway tiene métodos para emitir `NUEVA_SOLICITUD` y `ESTADO_ACTUALIZADO`, pero no hay controladores REST que los invoquen actualmente. Las suscripciones WebSocket no validan JWT ni roles. El flujo completo de solicitar, aprobar, rechazar y validar autorizaciones sigue pendiente.

## Alcance pendiente y limitaciones

- No existen rutas HTTP de ventas, caja, cuentas por cobrar, pagos de cuentas por pagar, deliveries, gastos, reportes, empresa, devoluciones, mermas ni recursos humanos/planilla, aunque hay modelos de base de datos para esas áreas.
- Falta la recepción/conversión automática de órdenes a compras y la actualización automática de totales/costos a partir del CRUD de costos adicionales.
- La edición/anulación de compras opera sobre cuentas por pagar internamente; eso no constituye un módulo independiente de gestión de pagos.
- Faltan permisos por rol y autenticación de las suscripciones WebSocket.
- Faltan migraciones/SQL de preparación, seed del usuario inicial y pruebas automatizadas.
- No se incluye el frontend ni una definición OpenAPI/Swagger.

La existencia de un modelo Prisma, una entidad o un adaptador no implica que el módulo completo esté disponible por HTTP. La referencia de rutas corresponde a `src/presentation/routes.ts` y los routers de cada módulo.
