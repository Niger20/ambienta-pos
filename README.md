# Ambienta POS

Sistema web de punto de venta y administración comercial. Reúne ventas, caja, inventario, compras, clientes, proveedores, cuentas por cobrar y por pagar, entregas, gastos, reportes y recursos humanos.

El repositorio contiene dos proyectos con dependencias y comandos independientes: una aplicación React en `app/` y una API REST con Express y PostgreSQL en `api/`. El sistema está en desarrollo; esta documentación describe el código disponible, incluida la incorporación del dashboard, ajustes y administración de usuarios.

## Documentación

| Documento | Contenido |
| --- | --- |
| [README general](README.md) | Visión del sistema, módulos, arquitectura, puesta en marcha y estado del proyecto. |
| [App](app/README.md) | Frontend, navegación, roles, conexión HTTP/WebSocket, importaciones y compilación. |
| [API](api/README.md) | Backend, base de datos, autenticación, rutas, flujos de negocio, Docker y operación. |
| [Docker y Railway](docs/deployment.md) | Imagen de la API, versiones conservadas en GHCR, PostgreSQL externo y CI/CD desde GitHub Actions. |

## Módulos

| Área | Funcionalidades presentes |
| --- | --- |
| Dashboard | Indicadores históricos, ventas recientes, stock bajo y valorización del inventario por categoría. |
| Acceso y autorizaciones | Login con JWT, administración de usuarios y roles, solicitudes de autorización y notificaciones por WebSocket. |
| Punto de venta | Búsqueda y escaneo, carrito, descuentos por línea y factura, contado, crédito, cotizaciones, pagos mixtos, efectivo en NIO/USD y delivery. |
| Pantalla del cliente | Carrito, totales y cambio en otra ventana del mismo navegador mediante `BroadcastChannel`. |
| Productos e inventario | Productos, categorías y subcategorías, unidades de medida, registros de imágenes por URL, movimientos, ajustes, mermas, importación Excel y códigos de barras. |
| Ventas y clientes | Historial, detalle e impresión, clientes y categorías, facturación de cotizaciones, devoluciones/cambios, cuentas por cobrar y abonos. |
| Compras y proveedores | Compras y líneas, costos adicionales, proveedores, órdenes, propuestas de reposición, importación Excel, cuentas por pagar y pagos. |
| Caja | Apertura y cierre de sesiones, consulta de sesión activa, reporte de cierre y retiros desde la app. |
| Deliveries | Entregas, repartidores y resumen diario. |
| Gastos | Registro de gastos, pagos y relaciones entre pagos y obligaciones. |
| Reportes | Utilidad, ventas, estado de resultados, flujo de caja, antigüedad de saldos, inventario, mermas, costo/pasivo laboral y bitácora. |
| Recursos humanos | Empleados, departamentos, cargos, salarios, asistencia, planilla, deducciones, horas extra, anticipos, préstamos y cuotas. |
| Prestaciones y parámetros | Vacaciones, décimo tercer mes, indemnización, liquidaciones, pagos de beneficios, INSS, tramos de IR y feriados. |
| Ajustes | Selección de tema visual y configuración de la tasa de cambio de la empresa. |

La cobertura de la interfaz y de la API varía por módulo: algunas entidades se administran mediante endpoints y otras tienen pantallas específicas. Las coordinaciones que realiza el frontend se explican en su README.

## Tecnologías

| Capa | Tecnologías declaradas |
| --- | --- |
| App | React 19, TypeScript 5.9, Vite 7, React Router 7, Axios y CSS. |
| Documentos e importación | jsPDF, jspdf-autotable, SheetJS (`xlsx`) y JsBarcode. |
| API | Node.js, TypeScript 5.9, Express 5 y arquitectura por capas. |
| Persistencia | PostgreSQL, Prisma 7, `@prisma/adapter-pg` y `pg`. |
| Seguridad y eventos | JWT, bcrypt, Helmet, CORS, express-rate-limit y `ws`. |
| Contenedores y despliegue | Docker multi-stage con Node.js 22, un servicio API que sirve React y CI/CD para Railway. PostgreSQL externo. |

Las versiones instaladas quedan fijadas en el `package-lock.json` de cada proyecto.

## Estructura

```text
ambienta-pos/
├── README.md
├── Dockerfile                  # API con frontend estático compilado
├── compose.yaml                # Solo el servicio api; PostgreSQL externo
├── railway.json                # Dockerfile y healthcheck para Railway
├── .github/workflows/ci.yml    # Compilación, prueba Docker y deploy
├── docs/deployment.md           # Activación y operación
├── app/
│   ├── README.md
│   ├── package.json
│   ├── vite.config.ts
│   ├── public/                 # Recursos estáticos de Vite
│   └── src/
│       ├── api/                # Axios e interceptores
│       ├── components/         # Componentes comunes y autorizaciones
│       ├── context/            # Autenticación y sesión de caja
│       ├── hooks/              # Suscripciones WebSocket
│       ├── layout/             # Cabecera, menú y estructura principal
│       ├── pages/              # Pantallas y hooks por módulo
│       ├── router/             # Rutas y acceso por rol
│       ├── styles/             # Tema y estilos adaptables
│       └── utils/              # Utilidades de datos y reportes
└── api/
    ├── README.md
    ├── package.json
    ├── prisma.config.ts
    ├── prisma/schema.prisma    # Modelo de datos
    └── src/
        ├── app.ts              # Entrada del servidor
        ├── domain/             # Entidades y enums
        ├── application/        # DTOs, casos de uso y contratos
        ├── infrastructure/     # Persistencia, seguridad y WebSocket
        ├── presentation/       # Servidor, rutas y controladores
        ├── data/postgres/      # Prisma y contexto de auditoría
        └── config/             # Entorno y adaptadores
```

No hay un `package.json` en la raíz. Para desarrollo, los comandos npm se ejecutan por proyecto; Docker compila ambos y ejecuta únicamente la API con los archivos estáticos de React.

## Arquitectura y comunicación

La app consume rutas REST bajo `/api`. En desarrollo, Vite reenvía `/api` y `/ws` al backend en el puerto **8080**. En un despliegue conjunto, Express puede servir la compilación de React desde `PUBLIC_PATH` y devolver `index.html` para las rutas del frontend.

```text
App → ruta HTTP → controlador → caso de uso → repositorio → datasource → Prisma → PostgreSQL
```

Los movimientos de stock usan helpers y transacciones en persistencia. El checkout reúne venta, líneas, pagos, inventario, crédito y delivery en una transacción. El alta de una compra se coordina desde la app mediante varias peticiones.

Las autorizaciones combinan REST y WebSocket en `/ws/autorizaciones`. La pantalla del cliente utiliza un canal local del navegador y no se sincroniza entre equipos por el servidor.

## Requisitos

- Node.js **22.12 o superior dentro de la rama 22**, compatible con ambos proyectos. La API declara `>=20.19`; Vite requiere `^20.19.0 || >=22.12.0`.
- npm y las dependencias de cada proyecto.
- PostgreSQL con un esquema compatible con [schema.prisma](api/prisma/schema.prisma).
- Un usuario inicial existente con contraseña bcrypt para iniciar sesión.
- Docker y Docker Compose si se ejecuta la API en un contenedor.

**La preparación de PostgreSQL es un requisito externo actual:** no hay migraciones, seed ni SQL de inicialización versionados. Instalar dependencias o levantar Compose no crea una base ni sus tablas, funciones y triggers de negocio. Consulta [la guía de la API](api/README.md#base-de-datos-y-prisma).

## Inicio local

### 1. Configurar e iniciar la API

Crea `api/.env`:

```dotenv
PORT=8080
PUBLIC_PATH=public
JWT_SEED=reemplazar_por_un_secreto_largo_y_aleatorio
POSTGRES_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/ambienta_pos
```

La conexión usa `POSTGRES_URL`. Los caracteres reservados de las credenciales deben codificarse para su uso en una URL.

En una terminal, desde la raíz:

```bash
cd api
npm ci
npm run dev
```

`npm ci` genera Prisma mediante `postinstall`; no modifica el esquema de PostgreSQL. La API estará en `http://localhost:8080/api`.

### 2. Iniciar la app

En otra terminal, desde la raíz:

```bash
cd app
npm ci
npm run dev
```

Abre la URL que muestre Vite, normalmente `http://localhost:5173`. Para este arranque deja `VITE_API_URL` sin definir: Axios utiliza `/api` y Vite lo reenvía a `localhost:8080`. La consulta de sesión de caja usa el mismo cliente Axios. WebSocket usa el proxy `/ws`.

Inicia sesión con el usuario previamente provisionado. Desde la cabecera puedes abrir caja antes de cobrar en el POS.

### Puertos de referencia

| Servicio | Puerto / URL |
| --- | --- |
| App en desarrollo | `http://localhost:5173` por defecto en Vite. |
| API para desarrollo con la app | `http://localhost:8080/api`, con el `.env` anterior. |
| WebSocket local | `ws://localhost:8080/ws/autorizaciones`, a través de Vite desde la app. |
| PostgreSQL | Servicio externo; se configura con `POSTGRES_URL`. |
| API y frontend estático en Compose | `http://localhost:3000`; puerto público configurable con `API_PORT`. |

Compose sirve el frontend compilado desde la API. Si usas Vite contra la API de Compose, adapta los destinos `/api` y `/ws` en `app/vite.config.ts` al puerto 3000.

## Compilación y despliegue

Los comandos se ejecutan en la carpeta correspondiente:

| Proyecto | Desarrollo | Compilación | Ejecución / revisión |
| --- | --- | --- | --- |
| App | `npm run dev` | `npm run build` → `app/dist/` | `npm run preview`; lint: `npm run lint`. |
| API | `npm run dev` | `npm run build` → `api/dist/` | `npm start`. |

Para servir ambos desde Express, compila la app, coloca el contenido de `app/dist/` en `api/public/` o configura `PUBLIC_PATH` con su ubicación, compila la API y ejecuta `npm start` desde `api/`. Las rutas profundas de React necesitan fallback a `index.html`.

El Dockerfile de la raíz compila React y la API en etapas separadas y copia solo las dependencias de producción, la API compilada y los archivos estáticos a la imagen final. Ejecuta Express como usuario `node`; no ejecuta Vite ni PostgreSQL. Compose declara únicamente `api` y recibe `POSTGRES_URL` para la base externa.

GitHub Actions valida cada cambio, conserva la imagen probada en GitHub Container Registry y despliega automáticamente en Railway al subir a `main`. Las versiones se etiquetan como `ghcr.io/niger20/ambienta-pos:ambienta-pos-AAAA-MM-DD-CODIGO`, con fecha de Nicaragua y el SHA corto del commit. La activación inicial requiere crear el servicio y configurar `RAILWAY_TOKEN` y `RAILWAY_SERVICE_ID` en GitHub. Sigue la [guía de Docker y Railway](docs/deployment.md).

## Acceso y roles

La interfaz reconoce `administrador`, `empleado` e `invitado`. Todos acceden al dashboard, POS, pantalla del cliente y ajustes. Empleados y administradores acceden además a productos, ventas, compras y deliveries. Gastos, recursos humanos, sesiones, reportes y usuarios se reservan al administrador en React.

Las rutas HTTP verifican JWT y la existencia del usuario. **La API todavía no aplica una política general de permisos por rol**, incluidas las rutas de aprobación y administración de usuarios. El WebSocket tampoco autentica las suscripciones. Las restricciones visuales del frontend no constituyen permisos del servidor.

## Estado y limitaciones

- Falta versionar la preparación reproducible de PostgreSQL y del primer usuario, incluida la función de recálculo de stock mínimo y los triggers necesarios.
- La app permite cargar una orden como compra y marcarla recibida, pero el DTO de creación de compras todavía no persiste el `ordencompraid` que envía la interfaz.
- Compras, importaciones y varias tareas de planilla se ejecutan en múltiples solicitudes. Un fallo intermedio puede dejar parte de la operación guardada.
- Los campos de consecutivos fiscales y comerciales existen en el modelo. Su generación no aparece en el checkout del backend y puede depender de la base externa.
- El dashboard suma las ventas activas sin excluir cotizaciones; sus totales pueden diferir de los reportes de gestión, que sí las excluyen.
- CI prueba el contenedor, HTTP, React y WebSocket con `scripts/docker-smoke.mjs`. No hay suites de negocio automatizadas; la API no tiene script de lint. El lint del frontend es informativo en CI por errores previos pendientes.

## Desarrollo y mantenimiento

Para cambios de interfaz, conserva la organización por módulos de `app/src/pages/`, separando componentes, tipos y hooks. Para cambios de negocio, revisa DTO, caso de uso, contrato, datasource, entidad y ruta en la API. Un cambio de esquema requiere regenerar Prisma y preparar por separado la actualización de PostgreSQL.

Antes de entregar cambios de código, ejecuta compilación y, para la app, lint. Verifica el flujo afectado con datos de desarrollo: login, caja, operación, cambios de stock/saldos y consulta del resultado. Si agregas rutas, variables o pasos de instalación, actualiza también el README correspondiente.

## Licencia

`api/package.json` declara `ISC`. El frontend es un paquete privado sin licencia declarada. No hay un archivo `LICENSE` general versionado.
