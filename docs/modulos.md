# Cómo agregar un módulo

Un módulo es una carpeta con su manifiesto. La app y el panel arman el menú leyendo el
registro de módulos y lo filtran por los permisos del usuario y los feature flags.

## 1. Manifiesto (`packages/shared/src/modulos.ts`)

```ts
{
  codigo: 'riego',
  nombre: 'Riego',
  descripcion: 'Turnos y lecturas de riego',
  icono: 'droplets',                 // nombre Lucide (agréguelo al mapa de Icono.tsx)
  plataformas: ['movil', 'web'],
  permisoVer: 'riego:ver',
  permisos: [
    p('riego:ver', 'Ver riego'),
    p('riego:crear', 'Registrar riego'),
  ],
  tablas: ['lecturas_riego'],
  rutaMovil: '/modulos/riego',
  rutaWeb: '/registros/lecturas_riego',
  estado: 'activo',                  // o 'proximamente' (pantalla con aviso)
  orden: 75,
}
```

## 2. Tabla sincronizable (si guarda datos)

1. Declárela en `packages/shared/src/tablas/registro.ts` (columnas, `direccion: 'ambas'`,
   `conGps`, `critica` si requiere validación, `permisos: { crear, editar }`).
2. Agregue la tabla Drizzle en `apps/api/src/db/esquema.ts` (use `comunes()`, `gps()`,
   `validacion()`) y el mapeo en `apps/api/src/sync/tablas.ts`.
3. `pnpm db:generate` y `pnpm db:migrate`.
4. Suba `VERSION_ESQUEMA` en `apps/mobile/src/db/esquema.ts` y agregue el paso en
   `apps/mobile/src/db/migraciones.ts` (`createTable` / `addColumns`).
5. Corra las pruebas: `consistencia-esquema.test.ts` y `esquema.test.ts` fallan si algo no
   coincide.

La tabla queda automáticamente en el pull/push, en la validación Zod del servidor, en
**Registros** del panel (con filtros y exportación) y en la bitácora.

## 3. Pantallas

- Móvil: `apps/mobile/app/modulos/riego/index.tsx` (ruta) y la lógica de guardado en
  `apps/mobile/src/modulos/riego/servicio.ts` usando `crear(tabla, datos, ctx)`. Use los
  componentes de `src/componentes` (opciones grandes, contador, selector de lote por GPS) y
  `useRequierePermiso('riego:crear')`.
- Si el formulario cambia a menudo, use el **motor de formularios dinámicos**: cree una
  definición en `definiciones_formulario` y renderícela con `<FormularioDinamico>` (como el
  muestreo de plagas). Agregar campos después no requiere publicar la app.
- Web: si basta con la tabla genérica, no hay que hacer nada (`/registros/<tabla>`).

## 4. Permisos y activación

- Los permisos del manifiesto se siembran en `permisos`; asígnelos a los roles en
  **Administración → Roles** (o en `apps/api/src/db/seed/datos.ts` para el demo).
- Active o apague el módulo por finca en **Administración → Módulos** (feature flags).
  `feature_flags` admite además `rol_id` para activarlo solo para un rol.

## Formularios dinámicos

Definición JSON versionada (`packages/shared/src/formularios`):

```json
{
  "codigo": "muestreo_plagas",
  "version": 3,
  "titulo": "Muestreo de plagas",
  "campos": [
    { "id": "plantas_revisadas", "tipo": "entero", "etiqueta": "¿Cuántas plantas revisó?", "requerido": true, "min": 1 },
    { "id": "dano_fruta", "tipo": "booleano", "etiqueta": "¿Hay daño en la fruta?", "requerido": true },
    { "id": "tipo_dano", "tipo": "opcion", "etiqueta": "Tipo de daño", "requerido": true,
      "visibleSi": { "campo": "dano_fruta", "igualA": [true] },
      "opciones": [{ "valor": "manchas", "etiqueta": "Manchas" }] },
    { "id": "severidad", "tipo": "opcion", "columna": "severidad", "opciones": [...] }
  ]
}
```

Tipos: `opcion`, `multiopcion`, `numero`, `entero`, `texto`, `booleano`, `escala`. `columna`
copia el valor a una columna del registro. Cada registro guarda `formulario_version`.
Desde el panel: **Administración → Formularios** («Agregar campo y publicar» o editar el JSON).
