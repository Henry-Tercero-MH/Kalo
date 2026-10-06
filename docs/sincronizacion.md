# Sincronización offline

La señal en campo es muy mala: **la app nunca espera al servidor** para guardar, mostrar o
validar un registro. Todo se escribe en WatermelonDB (SQLite) y un motor de sincronización
intercambia cambios con la API cuando hay red.

## Componentes

| Pieza                                    | Dónde                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Registro de tablas (una sola definición) | `packages/shared/src/tablas/registro.ts`                                |
| Esquema local generado                   | `apps/mobile/src/db/esquema.ts`                                         |
| Motor del celular                        | `apps/mobile/src/sync/motor.ts`                                         |
| Cola de archivos                         | `apps/mobile/src/sync/cola-archivos.ts`                                 |
| Disparadores                             | `apps/mobile/src/sync/disparadores.ts`                                  |
| Motor del servidor (sin base de datos)   | `apps/api/src/sync/motor.ts`                                            |
| Repositorio PostgreSQL                   | `apps/api/src/sync/repositorio-drizzle.ts`                              |
| Fusión de conflictos                     | `packages/shared/src/sync/fusion.ts`                                    |
| Pruebas con dos celulares                | `apps/api/test/sync-motor.test.ts`, `apps/api/test/integracion.test.ts` |

## Protocolo (compatible con `synchronize()` de WatermelonDB)

```
GET  /v1/sync/pull?last_pulled_at=<ms|null>
     → { changes: { tabla: { created, updated, deleted } }, timestamp, dispositivo: { accion } }

POST /v1/sync/push   { changes, lastPulledAt, estado: { versionApp, registrosPendientes, archivosPendientes } }
     → { resultados: [{ tabla, id, estado: aceptado|fusionado|rechazado, conflicto?, error? }],
         experimentalRejectedIds, serverTime }
```

- Autenticación con la **sesión del dispositivo** (JWT `typ: dispositivo` + refresh rotativo de
  180 días), no la del usuario: un usuario que inició sesión sin señal no tiene token, pero el
  celular sí. Cada registro lleva `created_by` y el servidor verifica los permisos **de ese
  usuario** (`modulo:accion`) y que pertenezca a la finca del dispositivo.
- **Delta, nunca la base completa.** Todas las tablas llevan `id` (UUID generado en el
  celular), `created_at`, `updated_at`, `server_updated_at`, `deleted_at`, `device_id`,
  `created_by` y `finca_id`. El pull devuelve filas con `server_updated_at > last_pulled_at`.
- **Datos por dispositivo:** solo su finca (y los catálogos globales). Los registros de campo
  se limitan a los últimos `sync_dias_historial` días (parámetro, 60 por defecto).
- **Borrado lógico:** nada se borra físicamente. Un registro borrado viaja como `updated` con
  `deleted_at` y la app lo oculta.
- **Respuesta por registro:** un registro inválido (Zod generado desde el registro de tablas),
  sin permiso o de otra finca se rechaza sin afectar a los demás (cada uno en su `SAVEPOINT`).
  Los rechazados vuelven a WatermelonDB como `experimentalRejectedIds` y quedan pendientes.
- Columnas que solo fija el servidor (`server_updated_at`, `estado_validacion`, `validado_*`)
  nunca se aceptan del celular: un registro crítico siempre entra como `pendiente`.

## Coherencia de `server_updated_at`

Un push toma un bloqueo exclusivo por finca (`pg_advisory_xact_lock`) y un pull uno
compartido; las escrituras del panel usan el mismo bloqueo (`escrituraSincronizada`). Así un
pull nunca entrega una marca de tiempo posterior a escrituras aún no confirmadas, que de otro
modo se perderían para siempre. La marca es estrictamente creciente dentro del proceso.

## Conflictos: gana el cambio más reciente, campo por campo

1. WatermelonDB envía en `_changed` las columnas que el usuario modificó.
2. El celular conserva la **versión base** de cada registro (`server_updated_at` que tenía al
   editarlo). Para ello la app usa `conflictResolver`: toma la versión remota, conserva los
   campos editados localmente y **mantiene el `server_updated_at` local**.
3. Después de un push que escribió registros, la app hace **un segundo ciclo** para descargar
   la versión del servidor de lo que acaba de enviar (así conoce su versión base).
4. En el servidor (`fusionarRegistro`): si el registro no cambió desde la versión base, se
   aplican los campos del celular. Si sí cambió (otro celular o el panel), para cada campo
   tocado gana el lado con `updated_at` mayor; los demás campos quedan como en el servidor.
5. Si hubo conflicto se escribe en `bitacora` (`accion = conflicto`) con ambas versiones. En
   tablas críticas (`cosecha`, `labores`, `alertas_fusarium`) queda `requiere_revision = true`
   y aparece en **Validación → Conflictos** del panel, donde el supervisor fija el valor final.
6. Si ganó el servidor, se incrementa `server_updated_at` para que el celular reciba la versión
   vigente y ambos celulares converjan.

Un registro crítico ya validado que se edita en campo vuelve a `pendiente`.

> Limitación conocida: «más reciente» usa el `updated_at` del registro completo como reloj de
> cada campo (WatermelonDB no guarda la hora por columna). Ver `decisiones.md`.

## Cola de archivos

Las fotos (lado mayor ≤ `foto_max_px` = 1.600 px, calidad `foto_calidad` = 0,7) y notas de
voz se guardan en el teléfono y se registran en la tabla `archivos` (`estado_subida =
pendiente`). **Suben después de los datos**: solo cuando el registro `archivos` ya está
sincronizado, la app pide `POST /v1/archivos/:id/subida` (URL prefirmada de MinIO), sube con
`PUT` y confirma con `POST /v1/archivos/:id/confirmar`. Si falla, se reintenta en la próxima
sincronización. Opción «Subir archivos solo con WiFi» en la pantalla Sincronizar.

## Disparadores

- Al abrir la app y al volver a primer plano.
- Al recuperar red (NetInfo).
- Cada `sync_intervalo_min` minutos (15) mientras hay red.
- En segundo plano con `expo-background-task` (el sistema decide el momento exacto).
- Botón «Sincronizar ahora» y después de guardar cada registro.
- Reintentos con espera exponencial (30 s, 1, 2, 4… hasta 15 min).

Varias llamadas simultáneas comparten la misma ejecución (single-flight).

**Envío manual (caporal).** Con la sesión de un caporal, los disparadores automáticos no envían
nada (`sync/envio-manual.ts`): lo tomado sin señal sale solo con «Enviar datos», donde el caporal
ve qué se enviará y qué repetidos se quitarán.

## Registros repetidos

Antes de cada envío (cualquier perfil) se buscan registros nuevos que repiten a otro del mismo
día y no se envían (`sync/duplicados.ts`). Un registro repite a otro si coinciden:

| Tabla | Columnas |
|---|---|
| `asistencia` | trabajador, fecha |
| `asignaciones_labor` | trabajador, tipo de labor, lote, fecha |
| `labores` | trabajador, cuadrilla, tipo de labor, lote, fecha, cantidad |

Se conserva el ya enviado o, si ninguno se envió, el primero que se guardó. Solo se quitan
registros que nunca llegaron al servidor (`_status = 'created'`); los editados siempre se envían.
Además, volver a tomar la asistencia del día actualiza los registros existentes en lugar de
crear otros.

## Visibilidad

Indicador permanente en el encabezado: **SINCRONIZADO / PENDIENTE / SINCRONIZANDO / ERROR /
SIN SEÑAL** (color + palabra) con `registros/archivos` en cola. La pantalla Sincronizar muestra
pendientes por módulo, archivos en cola, último envío, rechazados y conflictos.

## Hora confiable

Cada registro guarda la hora del dispositivo (`created_at`) y la hora del GPS (`hora_gps`),
además de `lat`, `lng` y `precision_gps`.

## Seguridad y respaldo

- Sesión de usuario con PIN verificado contra un hash PBKDF2 descargado; bloqueo de 5 minutos
  tras `login_intentos_max` intentos; la sesión caduca tras `sesion_inactividad_min` minutos.
- **Borrado remoto:** en Dispositivos el administrador marca «Borrado remoto»; en el siguiente
  pull el servidor responde `dispositivo.accion = borrar`, el celular confirma
  (`/v1/sync/borrado-confirmado`), borra la base local y el almacén seguro, y vuelve a la
  pantalla de configuración. Sus tokens quedan revocados.
- **Respaldo:** si un celular nunca logra sincronizar, Sincronizar → «Exportar respaldo
  cifrado» genera un archivo con los registros pendientes cifrados con AES-256-GCM usando la
  clave del dispositivo (el servidor guarda una copia al registrarlo). La oficina lo importa en
  Dispositivos → «Importar respaldo cifrado» y se procesa como un push normal (con conflictos).
- Cifrado de la base local: ver `decisiones.md` (D-007).

## Pruebas

```bash
pnpm --filter @kalo/api test                         # motor con dos celulares simulados
TEST_DATABASE_URL=postgres://kalo:kalo_demo@localhost:5432/kalo_campo_test pnpm --filter @kalo/api test
```

`sync-motor.test.ts` simula dos celulares con la misma lógica de WatermelonDB: registros sin
conexión que llegan sin duplicados (incluido un push repetido), edición concurrente con
conflicto en la bandeja del supervisor, cambios en campos distintos que se combinan, rechazos
por permiso/validación y borrado remoto. `integracion.test.ts` repite los criterios de
aceptación contra PostgreSQL + PostGIS por HTTP.
