# Ambienta POS

Sistema de punto de venta en desarrollo. Este repositorio contiene actualmente la API en `api/`, con gestión de catálogos, clientes, proveedores, órdenes de compra, compras, costos adicionales e inventario.

Estado revisado el **11 de octubre de 2026**, con el código del commit `162d059` como referencia. El esquema de base de datos contempla más áreas de negocio que las disponibles mediante la API.

## Estado actual

| Área | Implementación disponible |
| --- | --- |
| Autenticación y usuarios | Inicio de sesión con JWT, registro protegido, listado, edición y eliminación de usuarios. Contraseñas con bcrypt. |
| Catálogo | CRUD de productos, categorías, subcategorías y unidades de medida; búsqueda por nombre y código de barras. |
| Clientes | CRUD de clientes y categorías de clientes. |
| Proveedores | CRUD de proveedores. |
| Compras | Creación de cabeceras, consulta, edición y anulación; registro de líneas con actualización de stock y costo promedio ponderado. |
| Órdenes de compra | CRUD de cabeceras y productos por orden; filtros por proveedor, estado y orden. Crear o editar una orden no modifica el stock. |
| Costos adicionales | CRUD de costos por compra, con concepto, monto y filtro por compra. Estas rutas no recalculan el total de la compra ni el costo de los productos. |
| Reposición | Propuestas de pedido por proveedor y globales, basadas en ventas históricas y stock. Ruta para recalcular stock mínimo mediante una función de PostgreSQL. |
| Inventario | Registro y consulta de ingresos/egresos, historial por producto y relación entre movimientos y compras. |
| WebSocket | Gateway de suscripciones y notificaciones en `/ws/autorizaciones`; el flujo REST de autorizaciones aún no está conectado. |

### Alcance pendiente

- Ventas/POS, caja, cuentas por cobrar y pagos de cuentas por pagar, deliveries, gastos, reportes, empresa y autorizaciones no tienen rutas HTTP implementadas en esta versión. Algunos de sus modelos ya existen en Prisma; la edición y anulación de compras sí modifican cuentas por pagar internamente.
- El esquema también incluye devoluciones, mermas, auditoría y recursos humanos/planilla, sin módulos HTTP propios.
- Falta el flujo automático de recepción/conversión de órdenes a compras: las órdenes y las compras se gestionan por separado en las rutas actuales.
- El frontend no está versionado aquí. El servidor puede servir una compilación externa desde `api/public/`.
- Los roles `administrador`, `empleado` e `invitado` están definidos, pero las rutas actuales solo verifican JWT; falta aplicar permisos por rol.
- No hay migraciones, scripts SQL de preparación, seed ni suite automatizada de pruebas versionados. Una instalación completa requiere una base de datos compatible preparada por separado.

## Tecnologías

- Node.js **>= 20.19** y npm; la imagen Docker usa Node.js 22.
- TypeScript 5.9 y Express 5.
- Prisma 7 con `@prisma/adapter-pg` y PostgreSQL; Docker Compose usa PostgreSQL 15.
- JWT, bcrypt, Helmet, CORS y límite de intentos de inicio de sesión.
- WebSocket mediante `ws`.

## Estructura

```text
ambienta-pos/
├── README.md
└── api/
    ├── prisma/schema.prisma       # Modelos de base de datos
    ├── prisma.config.ts           # Configuración de Prisma
    ├── src/
    │   ├── app.ts                 # Entrada de la aplicación
    │   ├── domain/                # Entidades y roles
    │   ├── application/           # Casos de uso, DTOs, servicios y contratos
    │   ├── infrastructure/        # Persistencia, autenticación y WebSocket
    │   ├── presentation/          # Servidor, controladores y rutas HTTP
    │   ├── data/postgres/         # Cliente Prisma y contexto de usuario
    │   └── config/                # Variables de entorno y adaptadores
    ├── Dockerfile
    ├── docker-compose.yml
    ├── package.json
    └── README.md                  # Configuración y referencia de la API
```

La organización sigue Clean Architecture: los casos de uso dependen de contratos, y las implementaciones de persistencia usan Prisma. Las operaciones de stock de compras e inventario emplean transacciones y helpers compartidos.

## Ejecución local

1. Instala Node.js >= 20.19 y ten disponible una base PostgreSQL compatible con `api/prisma/schema.prisma`.
2. Desde la raíz del repositorio, entra en `api/` y crea allí un archivo `.env`:

   ```dotenv
   PORT=3000
   PUBLIC_PATH=public
   JWT_SEED=reemplazar_por_un_secreto_largo_y_aleatorio
   POSTGRES_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/ambienta_pos
   ```

3. Instala las dependencias e inicia el servidor desde `api/`:

   ```bash
   npm ci
   npm run dev
   ```

La API escucha en `http://localhost:3000/api`. `npm ci` genera el cliente Prisma mediante `postinstall`; no crea ni migra la base de datos. El primer usuario debe existir previamente, porque el registro requiere un JWT válido y no hay un seed incluido.

Para compilar y ejecutar la versión compilada, desde `api/`:

```bash
npm run build
npm start
```

## Documentación de la API

Consulta [api/README.md](api/README.md) para ver variables de entorno, rutas disponibles, paginación, Docker y limitaciones actuales. La conexión de Prisma y de la aplicación usa **`POSTGRES_URL`**.
