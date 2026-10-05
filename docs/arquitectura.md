# Arquitectura

```
 Celular (Expo / React Native)                Servidor                         Oficina
┌──────────────────────────────┐   HTTPS    ┌──────────────────────────┐     ┌──────────────────┐
│ Pantallas (Expo Router)      │  /v1/sync  │ API Fastify (Node 22)    │     │ Panel Next.js    │
│   ↓ lee/escribe solo local   │ ─────────▶ │  Zod + OpenAPI (/docs)   │ ◀── │ (proxy /api/v1,  │
│ WatermelonDB (SQLite)        │ ◀───────── │  JWT usuario/dispositivo │     │  cookies httpOnly)│
│ Motor de sync + cola archivos│            │  Drizzle ORM             │     └──────────────────┘
│ GPS (expo-location, tareas   │  PUT firmado│        │                 │
│  en segundo plano), MapLibre │ ─────────▶ │ PostgreSQL 16 + PostGIS  │
└──────────────────────────────┘    MinIO   │ MinIO (S3) archivos      │
                                            └──────────────────────────┘
                     packages/shared: tipos, registro de tablas, Zod, cálculos, permisos
                     packages/ui-tokens: colores y tipografía de la marca Kalo
```

## Principios

1. **Offline primero.** La app escribe siempre en su base local; la sincronización es un
   proceso aparte (ver `sincronizacion.md`).
2. **Una sola fuente de reglas.** `@kalo/shared` contiene el registro de tablas sincronizables,
   los esquemas Zod, las constantes, los permisos, el motor de formularios y los cálculos
   (ecuación productiva, factor por semana, pronóstico, geometría). Móvil, web y API usan el
   mismo código.
3. **Nada de negocio fijo en el código.** Permisos por rol, umbrales, intervalos de GPS, tamaño
   de celda, factores y colores de cinta viven en la base de datos (`parametros`, `semanas`,
   `rol_permisos`, `feature_flags`) y se editan desde el panel.
4. **Crecer sin reescribir.** Módulos con manifiesto, formularios dinámicos versionados,
   multi-empresa y multi-finca desde el diseño, API versionada (`/v1`).

## Monorepo

| Carpeta              | Contenido                                                                            |
| -------------------- | ------------------------------------------------------------------------------------ |
| `apps/mobile`        | Expo SDK 57 + Expo Router + WatermelonDB + MapLibre RN                               |
| `apps/web`           | Next.js 16 (App Router) + Tailwind 4 + MapLibre GL + TanStack Table/Query + Recharts |
| `apps/api`           | Fastify 5 + Zod + Swagger + Drizzle + PostGIS + MinIO                                |
| `apps/vision`        | Python + FastAPI (preparado)                                                         |
| `packages/shared`    | Reglas compartidas (TypeScript fuente, sin compilar)                                 |
| `packages/ui-tokens` | Tokens de la guía de marca → StyleSheet (móvil) y tema de Tailwind (web)             |
| `packages/config`    | TypeScript, ESLint y Prettier compartidos                                            |
| `infra`              | Docker Compose: Postgres + PostGIS, MinIO, API (perfil `api`)                        |

pnpm workspaces + Turborepo. `pnpm dev` levanta API y panel; la app se arranca aparte con
`pnpm dev:mobile` (requiere build de desarrollo, ver README).

## Modelo de datos

Todas las tablas sincronizables comparten columnas comunes (`id` UUID del celular,
`created_at`, `updated_at`, `server_updated_at`, `deleted_at`, `device_id`, `created_by`,
`finca_id`). Las que tienen ubicación guardan `lat`, `lng`, `precision_gps`, `hora_gps` y una
columna PostGIS `geom` **generada** a partir de lat/lng (los lotes, a partir del GeoJSON). Las
críticas (`cosecha`, `labores`, `alertas_fusarium`) tienen `estado_validacion`, `validado_por`,
`validado_en`, `motivo_rechazo`.

| Grupo        | Tablas                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| Organización | empresas, fincas, lotes (polígono, ha, población), dispositivos                                                |
| Usuarios     | usuarios, roles, permisos, rol_permisos, cuadrillas, cuadrilla_miembros, consentimientos, refresh_tokens       |
| Calendario   | semanas (año, número, color de cinta, factor), colores_cinta                                                   |
| Sanidad      | plagas (umbral), muestreos, preaviso_sigatoka, trampas (QR, punto), lecturas_trampa, alertas_fusarium (estado) |
| Producción   | enfunde, cosecha, conteos_cinta, pronosticos                                                                   |
| Personas     | trabajadores (DPI único), asistencia, tipos_labor (unidad, tarifa), labores                                    |
| GPS          | rutas, puntos_ruta, cobertura_lote                                                                             |
| Tareas       | ordenes_trabajo                                                                                                |
| Archivos     | archivos (tipo, tamaño, estado de subida, registro al que pertenece)                                           |
| Plataforma   | modulos, definiciones_formulario (JSON versionado), feature_flags, parametros, bitacora                        |

El esquema Drizzle está en `apps/api/src/db/esquema.ts`; las migraciones en
`apps/api/drizzle/`. La prueba `apps/api/test/consistencia-esquema.test.ts` verifica que
coincida con el registro compartido, y `apps/mobile/test/esquema.test.ts` lo mismo para
WatermelonDB.

## Autenticación y permisos

- **Usuarios:** `POST /v1/auth/login` (usuario + PIN, bcrypt) o `/v1/auth/gafete` (QR) →
  access JWT (15 min) + refresh opaco rotativo (30 días, guardado como hash).
- **Dispositivos:** `POST /v1/dispositivos/registrar` (lo hace un supervisor una sola vez) →
  sesión del dispositivo (refresh de 180 días) usada por la sincronización y la cola de
  archivos. Se revoca con el borrado remoto.
- **Sin señal:** cada celular descarga los usuarios de su finca con un hash PBKDF2 del PIN (y
  el hash del gafete); el inicio de sesión se valida localmente.
- **Permisos** `modulo:accion` en la base (`rol_permisos`), editables en Administración →
  Roles. La API los verifica en cada ruta (`app.requiere('cosecha:validar')`) y en cada
  registro del push; la app arma su menú con ellos y con los feature flags.
- Panel web: tokens en cookies httpOnly y un proxy (`/api/v1/*`) que agrega el token y lo
  renueva; el navegador nunca ve los tokens. Los roles sin plataforma `web` no entran al panel.
- Toda creación, edición, validación y borrado queda en `bitacora` con usuario, dispositivo y
  hora.

## GPS, rutas y cobertura

- **Lote automático:** punto dentro de polígono con los polígonos descargados
  (`loteEnPosicion` en `@kalo/shared`).
- **Rastreo por tarea:** `expo-location` + `expo-task-manager` con servicio en primer plano y
  notificación; solo mientras hay un recorrido activo. Intervalo y distancia por parámetro,
  modo ahorro de batería. Se descartan puntos con precisión > 30 m y la ruta se simplifica
  (Douglas-Peucker) al finalizar.
- **Cobertura:** tras cada push con puntos, la API divide cada lote tocado en una cuadrícula
  (`cobertura_celda_m`, 20 m) en la zona UTM del lote con `ST_SquareGrid` y marca las celdas
  a menos de `cobertura_radio_m` de algún punto de la semana. El resultado (porcentaje y
  celdas en GeoJSON) se guarda en `cobertura_lote`, que el panel muestra y que baja al celular.
- **Mapas sin conexión:** al configurar el dispositivo se descarga un paquete offline de
  MapLibre con el recuadro de la finca. Los polígonos y la cobertura vienen de la base local.
- **Consentimiento:** aviso y aceptación la primera vez, guardado en `consentimientos`.
- **Zona horaria:** semanas y cobertura se calculan en hora de Guatemala (`ZONA_HORARIA`).

## Puntos de extensión

| Extensión                                       | Dónde engancha                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Servicio de visión (conteo de cintas, sigatoka) | `apps/vision`; módulos `conteo_cintas` y `detector_sigatoka` (tabla `conteos_cinta` con `origen`) |
| Imágenes satelitales                            | Módulo web `satelital`; las capas se agregan al mapa del panel como fuentes raster                |
| Nómina / expedientes                            | Módulo `nomina`; `labores` + `tipos_labor.tarifa` (destajo) ya tienen los datos                   |
| Órdenes de trabajo                              | `ordenes_trabajo` sincronizada; las rutas guardan `orden_trabajo_id`                              |
| Servidor local en la finca                      | La API es un contenedor; los celulares solo necesitan otra URL (se elige al configurar)           |
| Habacus u otros sistemas                        | API versionada `/v1` documentada en OpenAPI (`/docs`, `/docs/json`)                               |
| Actualizaciones remotas                         | Expo EAS Update (`EAS_PROJECT_ID`, canales en `eas.json`)                                         |
| Errores                                         | Sentry por variable de entorno (`SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN`)                           |
