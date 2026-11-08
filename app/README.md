# Ambienta POS — App

Aplicación web de Ambienta POS, construida con React y TypeScript. Consume la [API del proyecto](../api/README.md) para operar ventas, compras, inventario, caja, finanzas y recursos humanos.

Para una descripción del sistema completo y la preparación de PostgreSQL, consulta el [README general](../README.md).

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| React 19 / React DOM | Componentes e interfaz. |
| TypeScript 5.9 | Tipos y comprobación durante la compilación. |
| Vite 7 y plugin React | Desarrollo, proxy y compilación. |
| React Router 7 | Navegación y rutas protegidas. |
| Axios | Cliente REST e interceptores de autenticación. |
| SweetAlert2 | Confirmaciones, avisos y errores. |
| jsPDF / jspdf-autotable | Exportación de documentos y tablas PDF. |
| SheetJS (`xlsx`) | Lectura y generación de archivos Excel. |
| JsBarcode | Generación de códigos de barras. |
| CSS y variables de tema | Estilos, disposición adaptable y temas visuales. |
| ESLint 9 | Revisión estática de TypeScript y hooks React. |

Las versiones instaladas se fijan en [package-lock.json](package-lock.json).

## Instalación y arranque

Necesitas Node.js compatible con Vite (`^20.19.0 || >=22.12.0`), npm y la API funcionando con una base preparada. Una versión 22.x desde 22.12 cumple los requisitos de ambos proyectos.

Desde la raíz del repositorio:

```bash
cd app
npm ci
npm run dev
```

Vite muestra la dirección de la app, normalmente `http://localhost:5173`. Con la configuración versionada, inicia la API en **8080** y deja `VITE_API_URL` sin definir. No se necesita un `.env` del frontend para ese escenario.

No existe modo demo ni registro público: para entrar necesitas un usuario de la base de datos. El alta de usuarios desde la app requiere iniciar sesión previamente con una cuenta administradora.

### Comandos

Ejecuta estos comandos desde `app/`:

| Comando | Efecto |
| --- | --- |
| `npm ci` | Instala las dependencias del lockfile. |
| `npm run dev` | Inicia Vite en desarrollo. |
| `npm run build` | Ejecuta `tsc -b` y genera la app en `dist/`. |
| `npm run preview` | Sirve la compilación para revisión local; requiere build previo. |
| `npm run lint` | Revisa el proyecto con ESLint. |

`preview` no utiliza el proxy de desarrollo configurado en `server.proxy`. Para probar las llamadas REST de la compilación, sírvela con la API o prepara un proxy adecuado.

## Conexión con la API

### HTTP y proxy local

[src/api/axios.ts](src/api/axios.ts) crea un cliente con:

```ts
baseURL: import.meta.env.VITE_API_URL || '/api'
```

Las peticiones del resto de la app usan rutas como `/productos` o `/ventas/checkout`. El interceptor agrega `Authorization: Bearer <token>` desde `localStorage`. Ante un `401` de una ruta ajena a autenticación, elimina las credenciales guardadas y redirige a `/login`.

[vite.config.ts](vite.config.ts) reenvía en desarrollo:

| Prefijo | Destino |
| --- | --- |
| `/api` | `http://localhost:8080`. |
| `/ws` | `ws://localhost:8080`, con soporte de WebSocket. |

El comentario de Axios menciona el puerto 3000, pero el destino real del proxy versionado es **8080**. Si cambias el puerto de la API, actualiza ambos destinos de Vite.

### Variable de entorno y consulta de caja

| Variable | Uso actual |
| --- | --- |
| `VITE_API_URL` | Reemplaza la base REST en Axios; también se usa como origen en una llamada directa desde `AuthContext`. |

Para Axios, un backend externo normalmente necesita incluir `/api`, por ejemplo `https://servidor.example/api`. Sin embargo, `refreshSession` en [AuthContext.tsx](src/context/AuthContext.tsx) construye su consulta de esta manera:

```ts
`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/sesiones/active`
```

Esto deja una incompatibilidad pendiente: con la URL anterior, la consulta auxiliar termina en `/api/api/sesiones/active`; sin variable, siempre consulta `localhost:8080`, incluso en una compilación publicada. Configurar solamente `VITE_API_URL` no resuelve ambos clientes a la vez. Antes de publicar o usar otro puerto/origen, hay que unificar esa consulta con Axios o ajustar su composición de URL.

Las variables `VITE_*` se incorporan al frontend al compilar y son visibles para el navegador. Los secretos JWT y credenciales de PostgreSQL pertenecen a la API.

### WebSocket

[useAutorizacionWS.ts](src/hooks/useAutorizacionWS.ts) conecta con `/ws/autorizaciones` en el origen de la página, usando `ws:` o `wss:` según el protocolo. `VITE_API_URL` no cambia esa dirección. Un despliegue separado necesita reenviar `/ws` hacia la API desde el dominio del frontend.

## Navegación y roles

Las rutas están definidas en [AppRouter.tsx](src/router/AppRouter.tsx). [ProtectedRoute.tsx](src/router/ProtectedRoute.tsx) comprueba la autenticación antes de renderizar las pantallas protegidas.

| Ruta | Pantalla | Acceso en la interfaz |
| --- | --- | --- |
| `/login` | Inicio de sesión | Público; redirige si ya hay sesión. |
| `/` | Redirección a `/dashboard` | Usuario autenticado. |
| `/dashboard` | Tablero de control | Todos los roles. |
| `/pos` | Punto de venta | Todos los roles. |
| `/pos/cliente` | Pantalla del cliente sin layout principal | Todos los roles. |
| `/settings` | Temas y tasa de cambio | Todos los roles. |
| `/products` | Productos e inventario | Empleado y administrador. |
| `/sales` | Ventas, clientes y cobros | Empleado y administrador. |
| `/purchases` | Compras, proveedores y pagos | Empleado y administrador. |
| `/deliveries` | Entregas y repartidores | Empleado y administrador. |
| `/expenses` | Gastos | Administrador. |
| `/sesiones` | Historial y reportes de caja | Administrador. |
| `/reportes` | Reportes de gestión | Administrador. |
| `/rrhh` | Recursos humanos y planilla | Administrador. |
| `/usuarios` | Administración de usuarios | Administrador. |

Las rutas desconocidas redirigen al dashboard. Los roles reconocidos son `administrador`, `empleado` e `invitado`. El servidor actualmente valida JWT sin aplicar estos permisos por rol; el bloqueo de pantallas es una regla del frontend.

## Funcionalidades por módulo

### Dashboard y ajustes

El dashboard reúne ventas acumuladas, últimas transacciones, productos activos, alertas de stock e inventario valorizado a costo y venta, con agrupación por categoría. Calcula los indicadores en el navegador a partir de ventas, productos, pagos y devoluciones solicitados con `limit=0`.

Actualmente la suma de ventas no excluye cotizaciones. La alerta de stock utiliza `stockminimo || 5`, por lo que un mínimo cero se interpreta como cinco. Para cifras operativas con filtros y criterios contables, revisa los reportes de gestión.

Ajustes permite elegir uno de los temas visuales y guardar la tasa NIO/USD en la primera empresa devuelta por la API. El tema se conserva en el navegador. La tasa proviene de la empresa; `36.50` es el valor de respaldo del código, no una cotización obtenida de una fuente externa.

### POS y pantalla del cliente

- Búsqueda por nombre y código de barras, ingreso por escáner, edición de cantidades y carrito.
- Descuentos por línea y por factura; el frontend convierte los descuentos porcentuales a montos para el checkout.
- Contado, crédito y cotización; tipos de factura `FISCAL`, `NO_FISCAL` o sin consecutivo.
- Efectivo, tarjeta, transferencias y pagos mixtos; conversión de efectivo USD a NIO y cálculo de cambio.
- Selección/creación de cliente y datos de delivery con repartidor, dirección y costo.
- Cobro mediante `POST /ventas/checkout`; el backend recalcula el total y persiste la operación en una transacción.
- Resumen posterior al cobro y generación de texto/enlace de WhatsApp para compartir manualmente.

Se requiere una sesión de caja abierta. El carrito y opciones se conservan en `sessionStorage` bajo `pos_state` para soportar recargas de la pestaña.

La ventana `/pos/cliente` recibe cambios por el canal `pos-customer-display` de `BroadcastChannel`. Debe abrirse en el mismo origen y contexto de navegador. Muestra productos, totales y cambio sin hacer una conexión de carrito al backend.

### Productos

Incluye gestión de productos, categorías/subcategorías, movimientos y ajustes, registro de mermas, reportes de inventario, importación de productos y etiquetas de códigos de barras. Las acciones que modifican stock dependen de las validaciones del backend.

### Ventas

Incluye historial y detalle de ventas, impresión, clientes, cotizaciones y su facturación, devoluciones/cambios, cuentas por cobrar, abonos y retiros. La devolución procesada por la API puede modificar inventario, deuda, reembolso y una nueva venta de cambio en una transacción.

### Compras

Incluye nueva compra, historial y edición, proveedores, órdenes, propuestas de reposición, costos adicionales, cuentas por pagar y sus pagos. Permite crear productos durante la compra y cargar líneas desde Excel.

El alta guarda primero la cabecera y después líneas, costos y, si corresponde, cuenta por pagar, en solicitudes distintas. Recibir una orden carga sus líneas en el formulario de compra; al guardar intenta marcarla `RECIBIDA_TOTAL`. El frontend envía `ordencompraid`, pero el DTO actual del backend no lo persiste. El borrador se conserva en `sessionStorage` bajo `purchase_state`.

### Gastos, sesiones y deliveries

Gastos administra registros, pagos y exportaciones. Sesiones permite consultar aperturas/cierres y generar reportes. La cabecera integra la sesión de caja activa y acciones de apertura/cierre. Deliveries administra entregas, repartidores y resumen diario.

### Reportes

Contiene utilidad por producto, cuentas por cobrar/pagar y gastos, además de reportes de gestión: estado de resultados, flujo de caja, antigüedad de saldos, libro y análisis de ventas, devoluciones, vencimientos, valorización/rotación de inventario, mermas, costo/pasivo laboral y bitácora. Los reportes ofrecen exportaciones e impresión según la vista, mediante PDF, Excel o una ventana de impresión.

### Recursos humanos

Reúne empleados, estructura organizativa, asistencia, vacaciones y acumulados, períodos y detalles de planilla, deducciones, horas extra, anticipos, préstamos, cuotas, prestaciones, liquidaciones y parámetros.

Parte de los cálculos vive en [payrollCalc.ts](src/pages/HR/payrollCalc.ts) y la coordinación de préstamos en [payrollApi.ts](src/pages/HR/payrollApi.ts). Por ejemplo, al modificar cuotas la app recalcula el monto pagado del préstamo y actualiza su estado; la API de cuotas no hace automáticamente esa sincronización. Las operaciones de varias solicitudes requieren revisar el resultado si ocurre un fallo intermedio.

### Usuarios y autorizaciones

Usuarios permite crear, editar, cambiar contraseña/rol y eliminar cuentas; la interfaz impide eliminar la propia cuenta activa. El backend hashea la contraseña antes de guardarla. Si se edita el usuario actual, la app sincroniza su nombre y rol locales.

Los componentes de [components/auth](src/components/auth) permiten solicitar autorización y validar un código antes de ejecutar determinadas acciones. Los hooks WebSocket avisan a administradores de solicitudes y al solicitante de su resolución. La API tiene el detalle de [rutas y mensajes](../api/README.md#autorizaciones-y-websocket).

## Importaciones Excel

Usa las plantillas descargables de cada pantalla. Se lee la primera hoja del archivo.

| Importación | Columnas de la plantilla |
| --- | --- |
| Productos | `codigobarra`, `nombre`, `preciocompra`, `precioventa`, `stockactual`, `stockminimo`, `categoria`, `descripcion`. |
| Líneas de compra | `codigobarra`, `nombre_producto`, `cantidad`, `precio_unitario`, `descuento`. |

En productos, la categoría se resuelve por nombre sin distinguir mayúsculas; las categorías no encontradas pasan por un diálogo de asignación. Las filas sin nombre se omiten y los productos se crean individualmente.

En compras, el código de barras identifica el producto y las líneas se agregan al borrador. Los códigos desconocidos abren el flujo de creación de producto. `nombre_producto` aparece en la plantilla, pero no se usa para resolver productos existentes. Conserva los códigos como texto en Excel si contienen ceros iniciales.

## Organización del código

```text
src/
├── main.tsx                    # ReactDOM y StrictMode
├── App.tsx                     # Proveedores, router y tema inicial
├── api/axios.ts                # Transporte HTTP
├── context/AuthContext.tsx     # Usuario, token y sesión de caja
├── router/                    # Rutas y guardas
├── layout/                    # MainLayout, Header y Sidebar
├── components/
│   ├── auth/                  # Modal y hook de autorización
│   ├── CashCalculator/        # Calculadora de efectivo
│   └── ui/                    # Modal y paginación
├── hooks/                     # WebSocket de autorizaciones
├── pages/                     # Un directorio por módulo funcional
├── styles/                    # Variables, temas, layout y pantallas
└── utils/                     # Normalización de respuestas y reportes
```

Los módulos suelen separar `index.tsx`, `types.ts`, componentes y hooks `use...`. [arrayUtils.ts](src/utils/arrayUtils.ts) normaliza respuestas como arreglos o envoltorios con `data`. Algunas entidades tienen `id` y otras claves como `productoid`; verifica el contrato concreto al agregar una integración.

### Persistencia local

| Almacenamiento | Datos |
| --- | --- |
| `localStorage` | `token`, `user`, `app-theme`, estado del menú y última vista de ciertos módulos. |
| `sessionStorage` | Borradores `pos_state` y `purchase_state`. |
| Estado React | Formularios, filtros, datos consultados y sesión de caja en memoria. |

Al iniciar, `AuthContext` restaura el token y usuario guardados. La validez del token se comprueba cuando la API recibe las peticiones. Cerrar sesión elimina `token` y `user` y limpia la sesión de caja en memoria; los borradores tienen su propio ciclo de vida.

## Compilación y despliegue

```bash
npm run build
```

El resultado es `app/dist/`. La configuración actual no copia ese contenido a la API.

Para un despliegue conjunto:

1. Revisa la consulta auxiliar de caja descrita en la sección de conexión.
2. Compila la app con la configuración del entorno de destino.
3. Copia el contenido de `dist/` a `api/public/`, o configura `PUBLIC_PATH` con la ubicación real de la compilación. Si inicias la API desde `api/`, `PUBLIC_PATH=../app/dist` permite servir el build local sin copiarlo.
4. Compila e inicia la API. Express ofrece `/api`, WebSocket y fallback a `index.html` en el mismo servidor.

Para alojarla separada, configura la base REST, CORS en la API, el reenvío WebSocket y un fallback de las rutas del navegador a `index.html`. El proxy de desarrollo de Vite no se incluye en el build. No hay un Dockerfile del frontend ni un proceso automático de empaquetado conjunto versionado.

## Verificación y problemas frecuentes

Para cambios de código, ejecuta `npm run build` y `npm run lint`, y prueba el módulo afectado contra una base de desarrollo. No hay script de pruebas unitarias ni end-to-end en `package.json`.

| Síntoma | Qué revisar |
| --- | --- |
| `ECONNREFUSED` en Vite | API iniciada en 8080 y destinos de `vite.config.ts`. |
| Login con error | Usuario provisionado, contraseña, base preparada y respuesta de `/api/auth/login`. |
| Regreso a login | Token vencido o inválido; el interceptor limpia credenciales ante `401`. |
| No aparece la caja activa | URL construida por `refreshSession`, puerto y posible `/api/api`. |
| WebSocket desconectado | Proxy de `/ws`, origen de la página y `wss:` si se usa HTTPS. |
| Pantalla del cliente vacía | Ventana abierta desde el POS, mismo origen y canal `BroadcastChannel`. |
| Error al recargar `/sales` u otra ruta | Fallback del servidor a `index.html`. |
| Importación incompleta | Plantilla, primera hoja, identificadores y resultados de cada solicitud. |
| Advertencia de bundle grande | La compilación carga muchos módulos en el bundle principal; no implica por sí sola un build fallido. |

El código actual puede compilar y tener errores de lint al mismo tiempo. La compilación de TypeScript y la revisión de ESLint son comprobaciones independientes.
