# Kalo Campo — demo

Plataforma de recolección de datos de campo para la bananera de **Inversiones Kalo**
(Guatemala): una **app móvil que funciona sin señal** y sincroniza al recuperarla, y un
**panel web** para la oficina. Todos los datos de este demo son ficticios y están marcados
como **DEMO**.

| Parte              | Tecnología                                                              | Dirección                               |
| ------------------ | ----------------------------------------------------------------------- | --------------------------------------- |
| App móvil          | Expo SDK 57 (React Native 0.86) + Expo Router + WatermelonDB + MapLibre | build de desarrollo Android             |
| Panel web          | Next.js 16 + Tailwind 4 + MapLibre GL + TanStack + Recharts             | http://localhost:3000                   |
| API                | Fastify 5 + Zod + Drizzle + PostgreSQL 16/PostGIS + MinIO               | http://localhost:4000 · docs en `/docs` |
| Visión (preparado) | Python + FastAPI                                                        | http://localhost:8000                   |

**¿Quiere ver la app ya?** Ábrala en el celular: https://henry-tercero-mh.github.io/Kalo/
(datos DEMO, sin servidor). Más opciones en [docs/DEMO.md](docs/DEMO.md): modo demo sin servidor en el
navegador del celular o en Expo Go, con guion de 10 minutos.

Documentación: [arquitectura](docs/arquitectura.md) · [sincronización](docs/sincronizacion.md)
· [cómo agregar un módulo](docs/modulos.md) · [decisiones y pendientes](docs/decisiones.md).
El prompt original está en `docs/PROMPT.pdf`.

## Datos mock (sin API) — modo por defecto

La app móvil y el panel web funcionan **sin la API**, con datos ficticios (DEMO):

- **App móvil:** al abrir carga sola los datos DEMO en el teléfono (`apps/mobile/src/demo/datos-demo.json`);
  la sincronización es simulada y no hace ninguna petición a la API. Perfil → «Reiniciar datos demo».
  Para usar el servidor real compile con `EXPO_PUBLIC_KALO_DATOS=api`.
- **Panel web:** usa datos DEMO grabados (`apps/web/src/mock/datos/*.json`) en un almacén en memoria del
  servidor de Next y muestra la etiqueta «DATOS DEMO (SIN API)». Los cambios (validar, resolver conflictos,
  órdenes, administración…) se ven en la interfaz y se pierden al reiniciar el servidor. Usuarios:
  `admin/1111`, `gerente/2222`, `supervisor/3333`. Para la API real: `KALO_DATOS=api pnpm --filter @kalo/web dev`.
- Regenerar los datos mock (con la API y el seed levantados): `pnpm --filter @kalo/api demo:movil` (app) y
  `node apps/web/scripts/grabar-mock.mjs` (panel). Detalles en `apps/web/README.md`.

Para ver todo sin servidor: `pnpm install && pnpm --filter @kalo/web dev` (panel en :3000) y la app según
[docs/DEMO.md](docs/DEMO.md). La API, Docker y el seed solo hacen falta con `KALO_DATOS=api` /
`EXPO_PUBLIC_KALO_DATOS=api`.

## Requisitos

- Node.js 22 y pnpm 10 (`corepack enable`)
- Docker con Docker Compose (o PostgreSQL 16 + PostGIS 3 y MinIO locales)
- Para la app: Android Studio (SDK y emulador) o un celular Android, y una cuenta de Expo si
  usará EAS Build

## Instalación

```bash
cp .env.example .env
pnpm install
docker compose -f infra/docker-compose.yml up -d   # Postgres+PostGIS y MinIO (crea el bucket)
pnpm db:migrate                                    # migraciones Drizzle (incluye la extensión PostGIS)
pnpm seed                                          # datos DEMO (pnpm seed:reset borra y vuelve a cargar)
pnpm dev                                           # API en :4000 y panel en :3000
```

Para correr también la API dentro de Docker: `docker compose -f infra/docker-compose.yml --profile api up`
(en ese caso no use `pnpm dev` para la API).

### App móvil

WatermelonDB y MapLibre son módulos nativos: la app corre en una **build de desarrollo**, no en
Expo Go.

```bash
# Opción A: compilar localmente (Android Studio instalado)
pnpm --filter @kalo/mobile android

# Opción B: EAS Build (genera un APK de desarrollo)
cd apps/mobile && npx eas build --profile development --platform android

# Luego, con el APK instalado:
pnpm dev:mobile
```

La dirección de la API se escribe en la pantalla **Configurar dispositivo**. En el emulador de
Android use `http://10.0.2.2:4000`; en un celular físico, la IP de su computadora en la red local
(p. ej. `http://192.168.1.50:4000`) y ajuste `S3_PUBLIC_ENDPOINT` a `http://192.168.1.50:9000`
para que las fotos puedan subir a MinIO.

## Variables de entorno

Todas están en `.env.example` (la API y Docker Compose leen el `.env` de la raíz).

| Variable                                                                                             | Uso                                                                      |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`                                                                                       | Conexión a PostgreSQL                                                    |
| `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`                   | MinIO; el público es la dirección que alcanzan el celular y el navegador |
| `JWT_SECRET` (≥ 32 caracteres), `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL_DIAS`, `JWT_DISPOSITIVO_TTL_DIAS` | Sesiones                                                                 |
| `CORS_ORIGINS`                                                                                       | Orígenes permitidos para la API                                          |
| `ZONA_HORARIA`                                                                                       | Zona horaria de la finca (por defecto `America/Guatemala`)               |
| `API_URL_INTERNA` / `NEXT_PUBLIC_API_URL`                                                            | URL de la API para el panel                                              |
| `NEXT_PUBLIC_MAP_STYLE_URL`, `EXPO_PUBLIC_MAP_STYLE_URL`                                             | Estilo del mapa base                                                     |
| `EXPO_PUBLIC_API_URL`                                                                                | URL propuesta al configurar el celular                                   |
| `SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN`                                                               | Errores (opcional)                                                       |
| `EAS_PROJECT_ID`                                                                                     | Actualizaciones remotas con EAS Update (opcional)                        |

## Usuarios del demo

| Usuario      | PIN  | Rol                | Usa                                   |
| ------------ | ---- | ------------------ | ------------------------------------- |
| `admin`      | 1111 | Administrador      | Panel                                 |
| `gerente`    | 2222 | Gerente            | Panel                                 |
| `supervisor` | 3333 | Supervisor         | Panel y app (configura los celulares) |
| `tecnico`    | 4444 | Técnico de sanidad | App                                   |
| `caporal`    | 5555 | Caporal            | App                                   |
| `trabajador` | 6666 | Trabajador         | App                                   |

Gafete QR de cada usuario (contenido del código): `KALO-GAFETE:DEMO-<usuario>`, por ejemplo
`KALO-GAFETE:DEMO-tecnico`. QR imprimibles de las 10 trampas: `pnpm qr:trampas` (genera
`apps/api/salidas/`) o el panel en `/api/v1/trampas/qr.pdf`.

## Datos DEMO

`pnpm seed` carga: Inversiones Kalo y «Finca Demo»; 6 lotes ficticios en Morales, Izabal
(población 1.600 plantas/ha); un usuario por rol; 2 cuadrillas de 8 trabajadores (DPI de
prueba); calendario de semanas del año anterior, actual y siguiente con colores de cinta **de
ejemplo** y el factor interpolado; catálogo de plagas y labores; 10 trampas con QR; 8 semanas
de muestreos, preavisos, lecturas, cosecha, labores, asistencia y rutas GPS (y 20 de enfunde
para que el pronóstico tenga cohortes), cobertura calculada, una alerta de Fusarium y órdenes
de trabajo. Lo que la finca debe confirmar quedó como parámetro **pendiente** (ver
`docs/decisiones.md`).

## Guion del demo (≈ 15 minutos)

1. **Configurar el celular (con señal, una vez).** Abra la app, escriba la URL de la API y entre
   como `supervisor` / 3333. Se descargan usuarios, lotes, catálogos, formularios y el mapa.
2. **Modo avión.** Active el modo avión en el celular. El indicador cambia a **SIN SEÑAL**.
3. **Técnico sin señal.** Inicie sesión como `tecnico` (PIN 4444) o con su gafete. En Inicio verá
   la finca, el **lote detectado por GPS**, la semana y su cinta, y sus tareas.
4. **Muestreo con foto y GPS.** Registrar → Plagas → Muestreo: el lote viene propuesto por GPS,
   elija la plaga, responda una pregunta por pantalla, tome una foto y grabe una nota de voz.
   Queda «Guardado en el teléfono». En Rutas GPS inicie un recorrido, camine y finalícelo.
5. **Segundo celular / caporal.** Cambie a `caporal` (5555): el menú solo muestra sus módulos
   (enfunde, cosecha, labores, Fusarium). Registre una cosecha. Si tiene dos celulares,
   edite la misma cosecha en ambos sin conexión.
6. **Recuperar señal.** Desactive el modo avión: se sincroniza solo (o «Sincronizar ahora»).
   Los registros llegan sin duplicados y luego suben las fotos.
7. **Panel (`supervisor` / 3333).** Mapa: lotes coloreados por estado de plagas (ALERTA en el
   lote 04), rutas, cobertura y el muestreo nuevo. Registros → Muestreos: filtre y exporte a
   Excel/CSV; vea la foto. Validación: valide la cosecha y resuelva el **conflicto** entre los
   dos celulares. Alertas de Fusarium: cambie el estado.
8. **Pronóstico (`gerente`).** Ecuación productiva por lote (1.600 × 1,85 × 0,98 × 1,37 ≈ 3.974
   cajas/ha/año al fijar esos valores) y pronóstico semanal con el factor de cada semana.
9. **Formulario dinámico (`admin`).** Administración → Formularios → agregue un campo y publique.
   Sincronice el celular: el campo aparece en el muestreo **sin instalar otra versión**.
10. **Dispositivos.** Vea el último sincronizado y los pendientes; muestre el borrado remoto.

## Criterios de aceptación

| Criterio                                                       | Cómo se cumple                                                            | Verificación automática                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| Técnico con PIN registra muestreo con foto y GPS en modo avión | Login offline (PBKDF2 local), escritura en WatermelonDB, cola de archivos | `integracion.test.ts` (servidor); app: guion paso 3–4 |
| Dos celulares sin conexión → todo llega sin duplicados         | UUID del celular, push idempotente por registro                           | `sync-motor.test.ts`, `integracion.test.ts`           |
| Conflicto de cosecha en la bandeja del supervisor              | Fusión campo por campo + `bitacora.requiere_revision`                     | `sync-motor.test.ts`, `integracion.test.ts`           |
| Lote por GPS y ruta de un recorrido                            | `loteEnPosicion`, rastreo con `expo-location` en segundo plano            | `geo-formatos.test.ts` (shared); app: guion           |
| Panel muestra registros nuevos en mapa, cobertura y tablas     | `/v1/mapa/*`, cobertura PostGIS, `/registros`                             | `integracion.test.ts`                                 |
| Pronóstico semanal usa el factor de la semana                  | `pronosticoSemanal` + calendario                                          | `calculos.test.ts`, `integracion.test.ts`             |
| Caporal solo ve los módulos de su rol                          | Menú desde `rol_permisos` + feature flags                                 | `permisos.test.ts`, `integracion.test.ts`             |
| Campo nuevo en el formulario llega tras sincronizar            | `definiciones_formulario` versionada                                      | `integracion.test.ts`, `formularios.test.ts`          |
| Interfaz conforme a la guía de marca                           | `@kalo/ui-tokens`, componentes de marca                                   | revisión visual (ver abajo)                           |

## Comandos

```bash
pnpm test          # pruebas de todos los paquetes
pnpm typecheck     # TypeScript en todo el monorepo
pnpm lint          # ESLint
pnpm build         # API (tsup) y panel (next build)
TEST_DATABASE_URL=postgres://kalo:kalo_demo@localhost:5432/kalo_campo_test pnpm --filter @kalo/api test
```

Las pruebas de integración de la API se omiten si no hay `TEST_DATABASE_URL` (usan una base
aparte que vacían y vuelven a sembrar).

## Guía de marca

Tokens en `packages/ui-tokens` (fuente `tokens.json`), usados como StyleSheet en la app y como
tema de Tailwind en el panel (`theme.css`, generado con `pnpm --filter @kalo/ui-tokens build`).
Fondo blanco; títulos `#141311` en Archivo 800 MAYÚSCULAS con línea negra de 2 pt; texto
`#3a3733`; verde solo como acento y en el botón principal (texto `#111111`); esquinas rectas,
sin sombras; íconos Lucide; estados siempre con color **y** palabra; números con punto de miles
y coma decimal. Adaptaciones de campo: áreas táctiles de 56 px, cuerpo de 16 px, opciones
grandes en lugar de teclado, colores de cinta como muestras con su nombre.

El PDF de la guía y el logo no venían con el prompt: colóquelos en `docs/marca/` (ver su
README). Mientras tanto se muestra «INVERSIONES KALO» en estilo título.
