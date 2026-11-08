# Ambienta POS — API

Backend REST de Ambienta POS. Implementa autenticación, catálogos, ventas, compras, inventario, caja, cuentas, entregas, gastos, reportes y recursos humanos sobre PostgreSQL. Comparte el servidor HTTP con un gateway WebSocket para autorizaciones y puede servir la compilación de la app React.

Consulta el [README general](../README.md) para la visión completa y el [README de la app](../app/README.md) para la integración con el frontend.

## Tecnologías y arquitectura

| Tecnología | Versión declarada / configuración |
| --- | --- |
| Node.js | `>=20.19`; Docker y CI utilizan Node.js 22. |
| TypeScript | `^5.9.3`. |
| Express | `^5.2.1`. |
| Prisma, cliente y adaptador PostgreSQL | `^7.3.0`. |
| PostgreSQL | Servicio externo mediante `POSTGRES_URL`; no se incluye en la imagen ni en Compose. |
| `pg` | Pool de conexiones PostgreSQL. |
| bcrypt / jsonwebtoken | Hash de contraseñas y JWT. |
| Helmet / CORS / express-rate-limit | Cabeceras, orígenes y limitación del login. |
| `ws` | WebSocket de autorizaciones. |

```text
api/
├── prisma/schema.prisma
├── prisma.config.ts
├── docker-compose.yml
└── src/
    ├── app.ts
    ├── domain/
    │   ├── entitites/           # Entidades; se conserva este nombre de carpeta
    │   └── enums/
    ├── application/
    │   ├── dtos/               # Validación de entradas
    │   ├── use-cases/          # Operaciones de negocio
    │   ├── services/           # Reglas compartidas, como costo promedio
    │   ├── repositories/      # Contratos de repositorios
    │   └── datasources/       # Contratos de persistencia
    ├── infrastructure/
    │   ├── datasource/        # Prisma, transacciones, helpers y reportes
    │   ├── repositories/      # Implementaciones de los contratos
    │   ├── middlewares/       # Autenticación
    │   ├── factories/         # Construcción de dependencias
    │   ├── auth/              # JWT y bcrypt
    │   ├── security/          # CORS, Helmet y límites
    │   └── websocket/         # Adaptador y gateway
    ├── presentation/          # Servidor, routers y controladores por recurso
    ├── data/postgres/         # Pool, cliente Prisma y contexto de usuario
    ├── config/                # Entorno y reexports de adaptadores
    └── generated/prisma/      # Cliente generado, ignorado por Git
```

El flujo habitual es `ruta → controlador → caso de uso → repositorio → datasource → Prisma → PostgreSQL`. Los routers construyen e inyectan sus dependencias. Los DTOs validan los cuerpos y consultas; los datasources concentran las transacciones y el acceso a datos. Los reportes avanzados usan consultas de lectura específicas desde su controlador.

## Instalación y configuración

Requisitos: Node.js, npm, PostgreSQL preparado y un usuario inicial existente. Para trabajar también con la app, una versión Node.js 22.x desde 22.12 es compatible con ambos proyectos.

Desde la raíz:

```bash
cd api
npm ci
```

Crea `api/.env` con valores locales:

```dotenv
PORT=8080
PUBLIC_PATH=public
JWT_SEED=reemplazar_por_un_secreto_largo_y_aleatorio
POSTGRES_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/ambienta_pos
NODE_ENV=development

# Opcional: ampliar los orígenes CORS, separados por comas
ALLOWED_ORIGINS=http://localhost:5173

```

| Variable | Comportamiento |
| --- | --- |
| `PORT` | Puerto HTTP obligatorio. `8080` coincide con el proxy de desarrollo de la app. |
| `PUBLIC_PATH` | Directorio estático; por defecto `public`, relativo al directorio desde el que se ejecuta la API. |
| `JWT_SEED` | Secreto obligatorio para firmar y verificar tokens. |
| `POSTGRES_URL` | Cadena usada por Prisma CLI y por el pool de la aplicación. |
| `ALLOWED_ORIGINS` | Agrega orígenes a la lista CORS. |
| `NODE_ENV` | Entorno de ejecución; Compose lo establece en `production`. |

`DATABASE_URL` no se usa. Codifica los caracteres reservados de las credenciales en `POSTGRES_URL`. El archivo `.env` está ignorado por Git; la plantilla `.env.template` puede existir localmente, pero no está versionada y no sustituye la configuración completa anterior.

### Comandos

Ejecuta desde `api/`:

| Comando | Efecto |
| --- | --- |
| `npm ci` | Instala dependencias y genera Prisma mediante `postinstall`. |
| `npm run dev` | Inicia `src/app.ts` con recarga de ts-node-dev. |
| `npm run prisma:generate` | Genera el cliente en `src/generated/prisma/`. |
| `npm run build` | Genera Prisma, limpia `dist/` y compila TypeScript. |
| `npm start` | Ejecuta `dist/app.js`; requiere build previo. |

```bash
npm run dev
```

Con `PORT=8080`, la base REST es `http://localhost:8080/api` y WebSocket se encuentra en `ws://localhost:8080/ws/autorizaciones`. Inicia el proceso desde `api/` para que `.env` y `PUBLIC_PATH` se resuelvan como en estos ejemplos.

No hay scripts de pruebas ni de lint definidos en el paquete.

## Base de datos y Prisma

El esquema está en [prisma/schema.prisma](prisma/schema.prisma) y la configuración CLI en [prisma.config.ts](prisma.config.ts). El cliente usa el generador `prisma-client`, `PrismaPg` y un pool `pg` compartido.

**El repositorio no incluye migraciones, seed ni SQL de inicialización.** `npm ci` y `prisma generate` generan código; no crean tablas. `prisma migrate deploy` no puede reconstruir la base a partir del contenido versionado actual. Se necesita una base ya preparada o un respaldo/SQL compatible obtenido por separado.

El modelo incluye valores calculados con `dbgenerated`, restricciones de negocio y relaciones que deben coincidir con la base real. La generación del cliente por sí sola no reproduce columnas calculadas, funciones ni triggers externos. Entre las dependencias conocidas están:

- `fn_recalcular_stock_minimo_global()`, invocada por la ruta de recálculo.
- Triggers de auditoría que lean `app.usuario_id`, si se quiere registrar el autor de los cambios.
- La infraestructura de consecutivos fiscales/comerciales que utilice la base: el checkout no los asigna explícitamente.

El primer usuario debe provisionarse con una contraseña bcrypt compatible. El registro HTTP requiere JWT, por lo que una instalación vacía no puede crear el primer administrador desde el login.

Después de cambiar el esquema, regenera el cliente y prepara por separado la actualización de PostgreSQL. `prisma db push` no reemplaza los objetos SQL y datos iniciales que faltan en este repositorio.

### Familias de datos

| Área | Modelos principales |
| --- | --- |
| Catálogo | `productos`, `categoriasproductos`, `unidadesmedida`, `imagenesproductos`. |
| Clientes y ventas | `clientes`, `categoriasclientes`, `ventas`, `ventaproductos`, `ventapagos`, `devoluciones`. |
| Compras | `proveedores`, `compras`, `comprasproductos`, `ordenescompra`, `ordenescompraproductos`, `costosadicionalescompras`. |
| Inventario | `movimientosinventario`, `movimientoscompras`, `movimientoventas`, `mermas`. |
| Finanzas y caja | `sesiones`, `cuentasporcobrar`, `abonos`, `cuentasporpagar`, `pagos`, `pagocuentasporpagar`, `gastos`, `pagogastos`. |
| Entregas | `deliveries`, `repartidores`, `ventadelivery`. |
| Administración | `usuarios`, `empresa`, `autorizaciones`, `auditoria`. |
| Personal | Empleados, departamentos, cargos, historial salarial y asistencia. |
| Nómina y beneficios | Períodos/detalles de planilla, deducciones, horas extra, anticipos, préstamos/cuotas, vacaciones, acumulados, liquidaciones y parámetros. |

El nombre histórico `acumuladodecimoprimermes` se conserva en el modelo y en la ruta; la interfaz lo presenta como décimo tercer mes.

## Autenticación y seguridad

Solo `POST /api/auth/login` es público entre los endpoints REST implementados. El resto exige:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Login:

```json
{
  "nombreusuario": "usuario_existente",
  "contrasena": "su_contrasena"
}
```

También se aceptan `password` y `pswd` como alias de contraseña en el login. La respuesta contiene:

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "nombreusuario": "usuario_existente",
    "rol": "administrador"
  }
}
```

Los tokens expiran a las ocho horas por defecto. El middleware verifica el JWT, busca al usuario y propaga su ID al contexto de auditoría. Los roles definidos son `administrador`, `empleado` e `invitado`, pero **las rutas actuales no aplican restricciones generales por rol**. Esto incluye registro, edición de usuarios y aprobación de autorizaciones. El gateway WebSocket acepta suscripciones sin validar JWT.

La creación de usuarios recibe `nombreusuario`, `contrasena` o `contrasenahash`, y un rol opcional. Aunque se llame `contrasenahash`, ese campo de entrada recibe una contraseña que el caso de uso hashea. La contraseña debe tener al menos ocho caracteres, mayúscula, minúscula, número y carácter especial.

El servidor configura Helmet, JSON/formularios con límite de 1 MB, `trust proxy=1` y diez intentos de login por IP cada quince minutos. Existe un limitador global, pero no está aplicado. CORS permite los orígenes locales 5173/3000/8080 y un dominio de producción declarado en el adaptador; `ALLOWED_ORIGINS` amplía la lista. También admite solicitudes sin encabezado `Origin`.

## Convenciones de respuesta

### Paginación

Los listados que usan `PaginationDto` aceptan `page` y `limit`:

```http
GET /api/productos?page=1&limit=25
```

Los valores predeterminados son página 1 y límite 25. `limit=0` devuelve todos los registros. La respuesta habitual es:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 0,
    "totalPages": 0
  }
}
```

Las consultas por relación, búsquedas, autorizaciones y algunos listados de anulados devuelven arreglos u objetos directos. No todos los endpoints comparten envoltorio. `GET /auth/getUser` lista usuarios; no es una ruta de perfil del usuario actual.

Las entidades suelen exponer `id`, aunque algunos recursos mantienen claves de negocio o compuestas. Consulta la entidad y el DTO del recurso antes de integrar. Los campos `Decimal` no tienen una serialización uniforme entre todas las respuestas; el consumidor debe normalizar los importes según el contrato recibido.

### Errores

El formato más habitual es `{ "error": "mensaje" }`. Se utilizan `400` para validación o negocio, `401` para autenticación y `429` para el límite de login. Algunos controladores devuelven `404` en consultas concretas y `500` en errores inesperados. No existe un middleware único que uniformice todos los códigos y cuerpos.

## Rutas HTTP

Todas las rutas siguientes son relativas a **`/api`**. Su montaje está en [src/presentation/routes.ts](src/presentation/routes.ts).

### Usuarios

| Método | Ruta | Uso |
| --- | --- | --- |
| POST | `/auth/login` | Login público. |
| POST | `/auth/register` | Crear usuario; requiere JWT. |
| GET | `/auth/getUser` | Listar usuarios. |
| PUT | `/auth/updateUser/:id` | Editar usuario, contraseña y rol. |
| DELETE | `/auth/deleteUser/:id` | Eliminar usuario. |

### Recursos con CRUD convencional

Cada prefijo de esta tabla ofrece `GET /`, `GET /:id`, `POST /`, `PUT /:id` y `DELETE /:id`. Los filtros indicados corresponden al listado y se agregan a la paginación.

| Prefijo | Recurso / filtros |
| --- | --- |
| `/categoria-productos` | Categorías; al crear, enviar `nombre` y `descripcion` como texto. |
| `/subcategoria-productos` | Categorías con padre; filtro `categoriaid`. |
| `/unidades-medida` | Unidades de medida. |
| `/clientes` | Clientes. |
| `/categorias-clientes` | Categorías de clientes. |
| `/proveedores` | Proveedores. |
| `/repartidores` | Repartidores. |
| `/deliveries` | Entregas; además `GET /deactivated`. |
| `/gastos` | Gastos. |
| `/pagos` | Pagos; además `GET /deactivated`. |
| `/cuentas-por-cobrar` | Cuentas de clientes; además `GET /deactivated`. |
| `/cuentas-por-pagar` | Cuentas de compras; además `GET /deactivated`. |
| `/venta-pagos` | Pagos de ventas; filtro `ventaid`. |
| `/costos-adicionales-compras` | Costos; filtro `compraid`. |
| `/ordenes-compra` | Órdenes; filtros `proveedorid`, `estado`. |
| `/imagenes-productos` | URL de imagen y marca principal; filtro `productoid`, sin carga binaria de archivos. |
| `/devoluciones` | Devoluciones; filtros `ventaid`, `productoid`; además `POST /procesar`. |
| `/mermas` | Mermas; filtros `productoid`, `usuarioid`. |
| `/empleados` | Empleados; filtros `cargoid`, `estado`; además `GET /deactivated`. |
| `/departamentos-empleados` | Departamentos. |
| `/cargos-empleados` | Cargos; filtro `departamentoid`. |
| `/historial-salarios` | Historial; filtro `empleadoid`. |
| `/periodos-planilla` | Períodos; filtro `estado`. |
| `/planilla-detalle` | Detalles; filtros `periodoid`, `empleadoid`. |
| `/planilla-deducciones` | Deducciones; filtro `detalleid`, con alias `planilladetalleid`. |
| `/planilla-horas-extra` | Horas extra; filtro `detalleid`, con alias `planilladetalleid`. |
| `/anticipos-salario` | Anticipos; filtros `empleadoid`, `mes`, `anio`, `estado`. |
| `/prestamos-empleados` | Préstamos; filtros `empleadoid`, `estado`. |
| `/cuotas-prestamos` | Cuotas; filtros `prestamoid`, `estado`. |
| `/solicitudes-vacaciones` | Solicitudes; filtros `empleadoid`, `estado`. |
| `/acumulado-vacaciones` | Acumulados; filtros `empleadoid`, `periodoid`. |
| `/acumulado-decimo-primer-mes` | Acumulado del décimo; filtros `empleadoid`, `periodoid`. |
| `/acumulado-indemnizacion` | Acumulados; filtros `empleadoid`, `periodoid`. |
| `/liquidaciones-empleados` | Liquidaciones; filtros `empleadoid`, `estado`. |
| `/pagos-beneficios` | Pagos; filtros `empleadoid`, `tipobeneficio`. |
| `/registro-asistencia` | Asistencia; filtros `empleadoid`, `fechainicio`, `fechafin`. |
| `/configuracion-inss` | Configuración; filtro `activo`. |
| `/tabla-tramo-ir` | Tramos; filtro `activo`. |
| `/feriados-nacionales` | Feriados; filtro `anio`. |

`DELETE` no significa lo mismo en todos los recursos: puede eliminar físicamente, desactivar o anular con efectos sobre saldos/stock. Revisa el datasource antes de usarlo como borrado genérico.

### Productos e inventario

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/productos` | Listado paginado. |
| GET | `/productos/:id` | Producto por ID. |
| GET | `/productos/search?q=texto` | Nombre sin distinguir mayúsculas; máximo 20 resultados. |
| GET | `/productos/barcode/:codigobarra` | Producto por código de barras. |
| GET | `/productos/deactivated` | Actualmente devuelve `[]`. |
| POST | `/productos` | Crear producto. |
| PUT | `/productos/:id` | Editar producto. |
| DELETE | `/productos/:id` | Eliminar físicamente; rechaza registros vinculados. |
| POST | `/productos/recalculate-stock-minimo` | Ejecutar función SQL de stock mínimo. |
| GET | `/movimientos-inventario` | Historial paginado. |
| GET | `/movimientos-inventario/:id` | Movimiento por ID. |
| GET | `/movimientos-inventario/producto/:productoid` | Historial de un producto. |
| POST | `/movimientos-inventario` | Movimiento manual con ajuste de stock. |

Las subcategorías se almacenan en `categoriasproductos` mediante una relación con la categoría padre.

### Ventas, caja y lecturas de detalle

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/ventas` | Ventas activas, incluidas cotizaciones. |
| GET | `/ventas/deactivated` | Ventas anuladas. |
| GET | `/ventas/:id` | Consultar venta. |
| POST | `/ventas` | Crear cabecera; no sustituye el checkout completo. |
| POST | `/ventas/checkout` | Guardar el cobro completo en una transacción. |
| PUT | `/ventas/:id` | Editar y facturar una cotización mediante cambio de tipo. |
| DELETE | `/ventas/:id` | Anular y restituir stock según reglas de negocio. |
| GET | `/venta-productos` | Listar detalles. |
| GET | `/venta-productos/venta/:ventaid` | Líneas de una venta. |
| GET | `/venta-delivery` | Listar relaciones venta/entrega. |
| GET | `/venta-delivery/venta/:ventaid` | Entregas de una venta. |
| GET | `/venta-delivery/delivery/:deliveryid` | Ventas de una entrega. |
| GET | `/sesiones` | Listar sesiones de caja. |
| GET | `/sesiones/active` | Sesión abierta del usuario autenticado. |
| GET | `/sesiones/:id` | Consultar sesión. |
| GET | `/sesiones/:id/reporte-cierre` | Reporte de movimientos y cierre. |
| POST | `/sesiones` | Abrir caja con `montoinicial`; el usuario se toma del JWT. |
| PUT | `/sesiones/close/:id` | Cerrar con `montofinalfisico`. |
| GET | `/abonos` | Listar abonos. |
| GET | `/abonos/cuenta/:cuentaid` | Abonos de una cuenta. |
| GET | `/abonos/:id` | Consultar abono. |
| POST | `/abonos` | Crear abono. |
| PUT | `/abonos/:id` | Editar abono. |
| DELETE | `/abonos/:id` | Eliminar abono. |

### Compras y órdenes

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/compras` | Compras activas. |
| GET | `/compras/deactivated` | Compras anuladas. |
| GET | `/compras/propuesta-global` | Reposición global con prioridades e inversión estimada. |
| GET | `/compras/propuesta/:proveedorId` | Reposición por proveedor. |
| GET | `/compras/:id` | Consultar compra. |
| POST | `/compras` | Crear cabecera. |
| PUT | `/compras/:id` | Editar cabecera y, opcionalmente, líneas/costos. |
| DELETE | `/compras/:id` | Anular y retirar stock comprado. |
| GET | `/compras-productos` | Listar líneas. |
| GET | `/compras-productos/compra/:compraid` | Líneas de una compra. |
| POST | `/compras-productos` | Crear línea, actualizar costo y aumentar stock. |
| GET | `/ordenes-compra-productos` | Listar líneas; filtro `ordencompraid`. |
| GET | `/ordenes-compra-productos/:ordencompraid/:productoid` | Consultar línea por clave compuesta. |
| POST | `/ordenes-compra-productos` | Añadir producto. |
| PUT | `/ordenes-compra-productos/:ordencompraid/:productoid` | Editar cantidad y precio. |
| DELETE | `/ordenes-compra-productos/:ordencompraid/:productoid` | Eliminar línea. |

### Relaciones de movimientos y pagos

Los prefijos siguientes exponen `GET /` y `POST /`, además de estas rutas por relación:

| Prefijo | Consultas GET adicionales | DELETE |
| --- | --- | --- |
| `/movimientos-compras` | `/movimiento/:movimientocompraid`, `/compra/:compraid` | `/:movimientocompraid/:compraid` |
| `/movimientos-ventas` | `/movimiento/:movimeintoventaid`, `/venta/:ventaid` | `/:movimeintoventaid/:ventaid` |
| `/pago-cuentas-por-pagar` | `/pago/:pagoid`, `/cuenta-pagar/:cuentapagarid` | `/:pagoid/:cuentapagarid` |
| `/pago-gastos` | `/pago/:pagoid`, `/gasto/:gastoid` | `/:pagoid/:gastoid` |

`movimeintoventaid` conserva la grafía existente en el código y en el modelo.

### Empresa y auditoría

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/empresa` | Listar empresas. |
| POST | `/empresa` | Crear empresa y parámetros. |
| PUT | `/empresa/:id` | Editar, incluida `tasacambio`. |
| GET | `/auditoria` | Listar; filtros `tabla`, `usuarioid`. |
| GET | `/auditoria/:id` | Consultar registro. |
| POST | `/auditoria` | Crear registro explícito. |

### Reportes

Todos usan `GET /reportes/<nombre>`. Los reportes de rango aceptan `fechaInicio` y `fechaFin`, en `YYYY-MM-DD` o fecha/hora ISO.

| Nombre | Parámetros / comportamiento |
| --- | --- |
| `utilidad-diaria` | Rango; por defecto el día actual. |
| `utilidad-producto` | Rango; por defecto el día actual. |
| `estado-resultados` | Rango y comparativo anterior. |
| `flujo-caja` | Rango; `agrupar=dia` o `mes`. |
| `antiguedad-saldos` | `tipo=cxc` o `cxp`; `fechaCorte`. |
| `libro-ventas` | Rango. |
| `ventas-periodo` | Rango. |
| `top-clientes` | Rango; `limite`, predeterminado 20, máximo 500. |
| `ventas-categoria` | Rango. |
| `devoluciones` | Rango. |
| `productos-por-vencer` | `dias`, predeterminado 60, entre 1 y 730. |
| `valorizacion-inventario` | `dias`, predeterminado 90, entre 7 y 730. |
| `inventario-sin-movimiento` | `dias`, predeterminado 60, entre 7 y 730. |
| `mermas` | Rango. |
| `costo-laboral` | Rango. |
| `pasivo-laboral` | Sin rango; situación acumulada. |
| `bitacora` | Rango; `usuarioid`, `tabla`, `operacion`, `limite` (300 por defecto, máximo 2000). |

Los rangos de gestión usan por defecto el primer día del mes hasta hoy. Las fechas sin hora se interpretan con límites del día en Nicaragua, UTC-6. Las consultas de gestión consideran ventas vigentes que no sean cotizaciones; no todos los consumidores de `/ventas` aplican ese filtro.

## Flujos de negocio

### Checkout de ventas

Ejemplo de `POST /api/ventas/checkout`, con IDs existentes, una sesión abierta y stock suficiente:

```json
{
  "sesionid": 1,
  "tipoventa": "CONTADO",
  "lugarventa": "NORMAL",
  "clienteid": null,
  "tipofactura": null,
  "descuentofactura": 0,
  "lineas": [
    { "productoid": 1, "cantidad": 2, "preciounitario": 50, "descuento": 0 }
  ],
  "pagos": [
    { "metodopago": "EFECTIVO", "monto": 100 }
  ]
}
```

- `tipoventa`: `CONTADO`, `CREDITO` o `COTIZACION`; `lugarventa`: `NORMAL` o `DELIVERY`.
- Las líneas no pueden repetir producto. Cantidad positiva, precio no negativo y descuento como **monto**, limitado al importe de la línea.
- El total se calcula desde las líneas, menos `descuentofactura`, más el costo de delivery; no se acepta un total del cliente como fuente del cálculo.
- Una venta al crédito requiere cliente y `fechavencimiento`, y crea la cuenta por cobrar. El DTO actual también exige pagos para crédito; el consumidor debe seguir ese contrato.
- Una cotización no requiere pagos y no descuenta stock. Su tipo de factura queda nulo.
- Delivery requiere `{ "repartidorid": 1, "direccionentrega": "Dirección", "costo": 20 }` en `delivery`.
- El checkout crea venta, detalles, pagos, cuenta por cobrar y entrega aplicables en una transacción. Un error revierte esa transacción.

Los métodos se normalizan a `EFECTIVO`, `TRANSFERENCIA` o `TARJETA`; los alias bancarios conservan banco/referencia. La interfaz convierte NIO/USD antes de enviar los importes. No hay una clave de idempotencia para repetir un checkout exitoso.

Al facturar una cotización, `PUT /ventas/:id` descuenta el stock de sus líneas. Anular una venta restituye cantidades y anula cuentas por cobrar; si tiene devoluciones, la operación se rechaza hasta resolverlas. Una venta facturada no puede volver a cotización mediante edición.

### Compras y costo promedio

`POST /compras` recibe `proveedorid`, `total`, `metodopago`, `tipocompra` y opcionalmente `facturaproveedor`, `estado`, `fecha`. Solo crea la cabecera. Cada `POST /compras-productos` recibe `compraid`, `productoid`, `cantidad` y opcionalmente `preciounitario`, `descuento`.

Cada línea se procesa en una transacción: valida producto y compra activa, guarda el detalle, actualiza costo promedio, aumenta stock y registra el movimiento y su relación con la compra.

```text
nuevo costo = (stock anterior × costo anterior + cantidad recibida × precio unitario)
              / (stock anterior + cantidad recibida)
```

Con stock anterior no positivo, se usa el precio recibido. El costo se redondea a dos decimales. El cálculo usa el precio unitario y no prorratea automáticamente descuentos ni costos adicionales.

Editar una compra puede reemplazar `lineas` y `costosAdicionales`, ajustar stock por diferencia y actualizar cuentas por pagar relacionadas. Anularla retira las cantidades recibidas; si el stock actual no alcanza, la transacción se rechaza.

El CRUD independiente de costos adicionales recibe `compraid`, `concepto` y `monto` no negativo. Solo guarda registros: no recalcula automáticamente total de compra, cuentas por pagar ni costo promedio.

### Órdenes y reposición

Una orden recibe `proveedorid` y opcionalmente `estado`, `fechaorden`, `fechaesperada`. Parte de `PENDIENTE`; los estados se normalizan a mayúsculas. Sus líneas reciben `ordencompraid`, `productoid`, `cantidadordenada` positiva y `preciounitario` no negativo, con una línea por producto según la clave compuesta.

Las órdenes no modifican stock. La app puede cargarlas en una nueva compra y después marcarlas recibidas, mediante varias llamadas. El esquema de compras tiene `ordencompraid`, pero el DTO de creación aún no lo persiste; no existe un endpoint atómico de recepción/conversión.

Las propuestas de reposición usan ventas activas de las últimas tres semanas con pesos 0.5, 0.3 y 0.2:

```text
sugerido = max(0, ceil(promedio semanal ponderado + stock mínimo - stock actual))
```

La propuesta global agrega prioridades e inversión estimada. El recálculo de stock mínimo depende de la función SQL externa indicada arriba.

### Inventario, mermas y devoluciones

Los egresos usan decrementos condicionados al stock disponible para evitar saldos negativos; los ingresos usan incrementos atómicos. Los helpers toman el stock anterior en el servidor.

El movimiento manual recibe `productoid`, `tipomovimiento`, `cantidad`, `motivo`. Para evitar ambigüedad usa `INGRESO` o `EGRESO`: aunque el DTO reconoce más alias/tipos, el datasource actual solo trata `INGRESO` como entrada y convierte los demás a egreso usando el valor absoluto de la cantidad. Usa los módulos específicos para devoluciones y mermas.

`POST /devoluciones/procesar` procesa varias líneas y, opcionalmente, un cambio. Valida que pertenezcan a una venta vigente, limita la cantidad a lo pendiente de devolver, restaura stock, aplica primero la devolución contra deuda y registra el reembolso restante. Un cambio genera una venta nueva. Reembolsos y cambios requieren una caja abierta. El flujo se ejecuta en una transacción.

Las mermas registran pérdida de inventario y contemplan recuperación en un producto destino según los datos enviados. Consulta sus DTOs antes de construir el cuerpo.

### Caja, cuentas y recursos humanos

La apertura de caja toma el usuario del JWT y el cierre recibe el monto físico. El cálculo de caja considera las operaciones según su tipo; las notas de crédito por devoluciones reducen deuda sin contarse como efectivo recibido.

Los pagos, relaciones de pagos, abonos y cuentas tienen endpoints separados. No asumas que crear un registro de relación equivale a ejecutar una liquidación completa: revisa las actualizaciones de saldo del datasource y el flujo de la app.

Los recursos de personal y nómina exponen CRUD y filtros. Parte del cálculo de planilla, acumulados y sincronización de préstamos/cuotas se coordina desde el frontend. Consumir solo un endpoint de cuota no ejecuta automáticamente todo ese flujo.

## Autorizaciones y WebSocket

| Método | Ruta bajo `/api` | Uso |
| --- | --- | --- |
| POST | `/autorizaciones` | Crear solicitud con `accion` y `detalle`; usuario del JWT. |
| GET | `/autorizaciones/pendientes` | Listar pendientes. |
| GET | `/autorizaciones/:id/estado` | Consultar estado. |
| PUT | `/autorizaciones/:id/aprobar` | Aprobar y generar código de seis dígitos. |
| PUT | `/autorizaciones/:id/rechazar` | Rechazar. |
| POST | `/autorizaciones/validar` | Validar `codigo` y, opcionalmente, `accion`. |

El código debe pertenecer a una solicitud aprobada creada durante el último día; validarlo la marca `USADO`. No hay un middleware general que exija ese código automáticamente a todas las operaciones de negocio: la app integra la validación en las acciones correspondientes.

El canal comparte puerto con HTTP en `/ws/autorizaciones`. Mensajes JSON enviados por el cliente:

```json
{ "type": "subscribe_admin" }
```

```json
{ "type": "subscribe_empleado", "autorizacionid": 123 }
```

```json
{ "type": "ping" }
```

El servidor responde con `subscribed` o `pong`. Notifica `NUEVA_SOLICITUD` a los administradores suscritos y `ESTADO_ACTUALIZADO` al solicitante, incluyendo `autorizacionid`, `estado` y, si se aprobó, `codigo`.

Las suscripciones viven en memoria del proceso. El gateway mantiene un cliente por ID de autorización y no autentica el rol declarado en el mensaje. La app usa el origen de la página para conectarse; un proxy debe soportar el upgrade WebSocket.

## Auditoría

El middleware guarda el ID autenticado en `AsyncLocalStorage`. El pool propaga el usuario a PostgreSQL con `set_config('app.usuario_id', ...)` cuando cambia el usuario asociado a la conexión. Los triggers externos pueden leer ese valor para registrar al autor.

La presencia del contexto no crea los triggers ni garantiza auditoría si la base no los tiene. También existen los endpoints de `auditoria` y el reporte de `bitacora` para consultar los registros disponibles.

## Docker

Desde la raíz, copia `.env.example` a `.env` y configura `POSTGRES_URL` para tu base externa y `JWT_SEED`:

```bash
# Solo API, con frontend estático servido por Express
docker compose up -d --build --wait --wait-timeout 120

# Logs y estado
docker compose logs -f
docker compose ps

# Detener el servicio
docker compose down
```

El único servicio de Compose es `api`, publicado en 3000 por defecto. No crea una base ni volúmenes de PostgreSQL. Los archivos antiguos `api/Dockerfile` y `api/docker-compose.yml` fueron sustituidos por el Dockerfile y `compose.yaml` de la raíz.

Compose inyecta `POSTGRES_URL`, `JWT_SEED`, `ALLOWED_ORIGINS`, `PORT=3000`, `PUBLIC_PATH=public` y `NODE_ENV=production`. `API_PORT` cambia el puerto público. El healthcheck `/api/health` verifica conexión a PostgreSQL y devuelve 503 si falla. No crea ni verifica el esquema de negocio.

El Dockerfile multi-stage de la raíz genera Prisma, compila la API y React y copia el frontend compilado a `public/`. La imagen final ejecuta únicamente `node dist/app.js` como usuario `node`. PostgreSQL y el servidor de desarrollo del frontend no se ejecutan en ella. Consulta la [guía de Docker y Railway](../docs/deployment.md) para activar CI/CD automático.

## Servir el frontend y desplegar

Express sirve `PUBLIC_PATH` y responde con `index.html` para rutas ajenas a `/api`. Una API sin frontend puede atender sus endpoints aunque no tenga ese archivo; abrir una ruta de la app requiere que exista el build.

Para servir el build local sin copiarlo, configura `PUBLIC_PATH=../app/dist` al iniciar desde `api/`. El Dockerfile de la raíz automatiza la compilación y copia a `public/`; la consulta de caja usa el mismo cliente Axios que el resto de la app.

En un despliegue tras proxy, configura HTTP/WebSocket, el origen de la app, `POSTGRES_URL`, el secreto JWT y el directorio estático según el entorno. El proceso actual escucha HTTP; HTTPS puede terminar en el proxy de alojamiento.

## Verificación y problemas frecuentes

Para cambios del backend, ejecuta `npm run build`. Para pruebas funcionales usa una base de desarrollo preparada y verifica login, apertura de caja, compra, venta, efectos en stock/saldos y anulaciones. Los identificadores de los ejemplos son ilustrativos y deben reemplazarse por registros existentes.

| Síntoma | Revisión |
| --- | --- |
| Falta `PORT` o `JWT_SEED` | `.env` en `api/` y directorio de ejecución. |
| Falta el cliente Prisma | `npm run prisma:generate`; no editar `src/generated/prisma/` manualmente. |
| Conexión PostgreSQL fallida | `POSTGRES_URL`, servicio disponible, host y credenciales. |
| Tabla/columna inexistente | Compatibilidad de la base con `schema.prisma`; instalar npm no prepara el esquema. |
| Función de stock mínimo inexistente | SQL externo de `fn_recalcular_stock_minimo_global()`. |
| `401` | JWT Bearer vigente y usuario existente. |
| `429` al entrar | Límite de diez solicitudes de login por IP en quince minutos. |
| Origen CORS rechazado | Lista del adaptador y `ALLOWED_ORIGINS`. |
| App local sin conexión | Vite apunta a 8080; Compose publica 3000. |
| Falla una ruta React al recargar | Build en `PUBLIC_PATH` y `index.html` disponible. |
| Stock insuficiente al vender/anular compra | Existencias actuales y movimientos previos. |
| Compra parcialmente registrada | Revisar cabecera, líneas, costos y cuenta: el alta completa usa varias solicitudes. |

Al extender un recurso, actualiza DTO, caso de uso, contratos, persistencia, entidad, controlador/ruta y esta referencia según corresponda. Los cambios de stock deben conservar las transacciones y los helpers compartidos.
