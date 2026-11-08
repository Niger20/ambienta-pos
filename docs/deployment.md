# Docker, Railway y versiones en GitHub

El único servicio desplegado es `api`. Su imagen contiene Node.js, la API compilada, sus dependencias y el frontend compilado que Express sirve desde `public/`. PostgreSQL se conecta externamente mediante `POSTGRES_URL`.

## CI/CD

Cada push a `main` ejecuta `.github/workflows/ci.yml`:

1. Instala y compila API y frontend.
2. Construye una imagen y prueba PostgreSQL, HTTP, React, rutas SPA, autenticación y WebSocket. La base de datos temporal pertenece únicamente a CI.
3. Si las pruebas pasan, publica **esa misma imagen** en GitHub Container Registry (GHCR).
4. Sube el código a Railway, donde se construye la imagen del despliegue usando el mismo Dockerfile. Cuando existe `RAILWAY_PUBLIC_URL`, verifica también el servicio público.

Los pull requests validan sin publicar imágenes ni desplegar. La publicación en GHCR usa `GITHUB_TOKEN` con `packages: write`; no necesitas crear otro secret. Si falla la publicación, el job falla y Railway no se despliega.

## Nombres y conservación de las imágenes

El paquete se llama `ghcr.io/niger20/ambienta-pos`. Cada versión utiliza esta etiqueta:

```text
ambienta-pos-AAAA-MM-DD-CODIGO
```

La fecha corresponde al día de construcción en `America/Managua`; `CODIGO` son los primeros siete caracteres del SHA del commit. Por ejemplo:

```text
ghcr.io/niger20/ambienta-pos:ambienta-pos-2026-11-07-27439fa
```

El SHA completo queda registrado en la etiqueta OCI `org.opencontainers.image.revision`. La imagen también incluye el enlace al repositorio para asociar el paquete con el proyecto. La referencia publicada aparece en el resumen del job de GitHub Actions.

Las versiones anteriores permanecen en GitHub Packages; este workflow no incluye una tarea de borrado. Repetir el workflow para el mismo commit durante el mismo día vuelve a publicar la misma etiqueta; un commit o fecha diferentes generan otra etiqueta.

Puedes verlas en el apartado **Packages** del repositorio o de la cuenta [Niger20](https://github.com/Niger20?tab=packages&repo_name=ambienta-pos). El primer paquete se crea con visibilidad privada por defecto. Para descargar una versión privada desde otro equipo, inicia sesión en GHCR con un token con `read:packages` y luego ejecuta:

```bash
docker pull ghcr.io/niger20/ambienta-pos:ambienta-pos-2026-11-07-27439fa
```

Esta es una copia versionada de la imagen validada en CI. Railway continúa construyendo desde el código; todavía no descarga esta imagen de GHCR.

## Variables de Railway y GitHub

En el servicio Railway, configura `POSTGRES_URL`, `JWT_SEED`, `ALLOWED_ORIGINS` y **`PORT=3000`**. El **Target Port del dominio también debe ser 3000**. Mantén la raíz del servicio en `/`, utiliza `/railway.json` y el comando de arranque del Dockerfile.

En GitHub → **Settings → Secrets and variables → Actions**:

| Tipo | Nombre | Contenido |
| --- | --- | --- |
| Secret | `RAILWAY_TOKEN` | Project Token del entorno de producción de Railway. |
| Variable | `RAILWAY_SERVICE_ID` | ID del servicio API. |
| Variable opcional | `RAILWAY_PUBLIC_URL` | URL HTTPS del servicio. |

Si usas este workflow, desactiva los despliegues automáticos de la integración nativa de GitHub en Railway para evitar despliegues duplicados. El esquema, funciones, triggers y usuario inicial deben existir en la base externa; el workflow no los crea.

Referencias: [GHCR y autenticación con GITHUB_TOKEN](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [construcciones con Dockerfile en Railway](https://docs.railway.com/builds/dockerfiles).
