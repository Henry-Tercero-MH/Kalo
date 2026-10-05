# Panel web (`@kalo/web`)

Panel de oficina de Kalo Campo: Next.js 16 (App Router), TypeScript y React Query.

## Fuente de datos: demo o API

| `KALO_DATOS`             | Modo     | Qué hace                                                                                           |
| ------------------------ | -------- | -------------------------------------------------------------------------------------------------- |
| sin definir o otro valor | **Demo** | Datos DEMO en memoria del servidor de Next. No necesita la API, ni base de datos, ni MinIO.        |
| `api`                    | **API**  | El proxy `app/api/v1/[...ruta]` reenvía a la API Fastify (`API_URL_INTERNA`, por defecto `:4000`). |

```bash
pnpm --filter @kalo/web dev                 # modo demo (por defecto)
KALO_DATOS=api pnpm --filter @kalo/web dev  # API real
```

En modo demo el panel muestra la etiqueta **«DATOS DEMO (SIN API)»** junto al logo.

### Usuarios del modo demo

| Usuario                            | PIN                    | Rol                                                    |
| ---------------------------------- | ---------------------- | ------------------------------------------------------ |
| `admin`                            | `1111`                 | Administrador                                          |
| `gerente`                          | `2222`                 | Gerente                                                |
| `supervisor`                       | `3333`                 | Supervisor                                             |
| `tecnico`, `caporal`, `trabajador` | `4444`, `5555`, `6666` | Roles de campo: usan la app móvil y no entran al panel |

## Cómo funciona el modo demo

- **Fixtures** (`src/mock/datos/*.json`, versionados y marcados como DEMO): respuestas reales de
  la API con el seed de ejemplo. Ver `src/mock/datos/README.md`.
- **Almacén en memoria** (`src/mock/almacen.ts`): se crea en la primera petición desde los
  fixtures y queda como singleton en `globalThis` (sobrevive a las recargas de `next dev`).
  **Al reiniciar el servidor los datos vuelven al estado de los fixtures.** Si los fixtures se
  grabaron hace semanas, sus fechas se adelantan en semanas completas para que los filtros por
  defecto («últimos 30 días») sigan mostrando datos.
- **Enrutador** (`src/mock/enrutador.ts`): `responderMock(metodo, ruta, query, cuerpo, usuario)`
  responde las mismas rutas `/v1/...` que usa el panel, con los mismos permisos que la API
  (403 si el rol no tiene el permiso) y las mismas validaciones (esquemas de `@kalo/shared`).
- **Sesión** (`src/mock/sesion.ts`): `POST /api/sesion` valida usuario + PIN contra los usuarios
  DEMO y guarda en la cookie httpOnly `kalo_at` un token `mock:<usuarioId>`. `perfilActual()`
  arma el perfil (equivalente a `/v1/auth/yo`) desde el rol en memoria, así que los cambios de
  permisos en Administración aplican al instante. `/api/sesion/renovar` solo redirige.

### Qué se puede hacer en modo demo

- Consultar todo: mapa, registros (filtros desde/hasta/lote/usuario/validación aplicados en
  memoria), pronóstico (la ecuación se recalcula con los ajustes), validación, alertas, órdenes,
  dispositivos y administración.
- Exportar a **CSV y Excel** (mismo formato que la API, horas en zona de la finca) y descargar el
  PDF de QR de trampas (`/v1/trampas/qr.pdf`, grabado).
- Mutaciones que se reflejan en la UI: validar/rechazar registros, resolver conflictos, cambiar
  estado de alertas, crear órdenes, bloquear/reactivar/borrado remoto de dispositivos, usuarios
  (crear, editar rol/PIN/activo, gafete), permisos por rol, lotes/plagas/labores/colores, semanas,
  parámetros, módulos (feature flags), formularios (publica versión + 1) y guardar instantánea del
  pronóstico. Cada mutación queda en la bitácora DEMO.
- Fotos: los registros de cosecha, muestreos y alertas de Fusarium muestran una imagen de ejemplo
  «FOTO DEMO».
- **No disponible:** importar respaldos cifrados (responde con un aviso: use `KALO_DATOS=api`).

## Regrabar los fixtures

Con la API levantada (`http://localhost:4000`) y el seed DEMO cargado:

```bash
node apps/web/scripts/grabar-mock.mjs [--api http://localhost:4000] [--sin-actividad] [--forzar-actividad]
```

El script inicia sesión como admin, gerente y supervisor y graba todos los GET que usa el panel.
Si la bandeja de conflictos está vacía, antes genera actividad realista en la API: registra dos
celulares (con el supervisor), sube una cosecha y dos ediciones concurrentes desde ambos celulares
para que aparezca un conflicto de sincronización (`--sin-actividad` lo omite;
`--forzar-actividad` lo repite). Los JSON quedan formateados con el Prettier del monorepo.

## Verificación

```bash
npx tsc -p . --noEmit
npx eslint .
node scripts/copiar-maplibre.mjs && npx next build
```
