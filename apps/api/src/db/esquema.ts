/**
 * Esquema de PostgreSQL 16 + PostGIS (Drizzle ORM).
 *
 * Convenciones:
 *  - Nombres de columnas en snake_case, idénticos al registro de `@kalo/shared` para que la
 *    sincronización sea genérica.
 *  - Fechas de sincronización en milisegundos (bigint), igual que WatermelonDB.
 *  - Las tablas con ubicación guardan lat/lng y una columna `geom` (PostGIS) generada.
 *  - Nada se borra físicamente: `deleted_at` es borrado lógico.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  customType,
  date,
  doublePrecision,
  geometry,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const ms = (nombre: string) => bigint(nombre, { mode: 'number' });

/** Drizzle solo modela geometry(point); los polígonos se declaran con un tipo propio. */
const poligono = customType<{ data: string; driverData: string }>({
  dataType: () => 'geometry(Polygon,4326)',
});

/** Columnas que llevan todas las tablas sincronizables. */
const comunes = () => ({
  id: uuid('id').primaryKey().defaultRandom(),
  created_at: ms('created_at').notNull(),
  updated_at: ms('updated_at').notNull(),
  server_updated_at: ms('server_updated_at').notNull().default(0),
  deleted_at: ms('deleted_at'),
  device_id: text('device_id'),
  created_by: uuid('created_by'),
  finca_id: uuid('finca_id'),
});

/** Ubicación + hora confiable del GPS + geometría PostGIS generada. */
const gps = () => ({
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  precision_gps: doublePrecision('precision_gps'),
  hora_gps: ms('hora_gps'),
  geom: geometry('geom', { type: 'point', srid: 4326 }).generatedAlwaysAs(
    sql`CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326) END`,
  ),
});

/** Validación del supervisor (tablas críticas). */
const validacion = () => ({
  estado_validacion: text('estado_validacion').notNull().default('pendiente'),
  validado_por: uuid('validado_por'),
  validado_en: ms('validado_en'),
  motivo_rechazo: text('motivo_rechazo'),
});

const idxSync = (nombre: string) => (t: { server_updated_at: unknown; finca_id: unknown }) => [
  index(`${nombre}_sync_idx`).on(t.finca_id as never, t.server_updated_at as never),
];

// ─── Organización ──────────────────────────────────────────────────────────
export const empresas = pgTable(
  'empresas',
  { ...comunes(), nombre: text('nombre').notNull(), codigo: text('codigo').notNull() },
  idxSync('empresas'),
);

export const fincas = pgTable(
  'fincas',
  {
    ...comunes(),
    empresa_id: uuid('empresa_id')
      .notNull()
      .references(() => empresas.id),
    nombre: text('nombre').notNull(),
    codigo: text('codigo').notNull(),
    unidad_area: text('unidad_area').notNull().default('ha'),
    centro_lat: doublePrecision('centro_lat').notNull(),
    centro_lng: doublePrecision('centro_lng').notNull(),
    bbox: jsonb('bbox').notNull(),
  },
  idxSync('fincas'),
);

export const lotes = pgTable(
  'lotes',
  {
    ...comunes(),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    hectareas: doublePrecision('hectareas').notNull(),
    poblacion: doublePrecision('poblacion').notNull(),
    poligono: jsonb('poligono').notNull(),
    geom: poligono('geom').generatedAlwaysAs(
      sql`ST_SetSRID(ST_GeomFromGeoJSON(poligono::text), 4326)`,
    ),
  },
  (t) => [...idxSync('lotes')(t), index('lotes_geom_idx').using('gist', t.geom)],
);

export const dispositivos = pgTable('dispositivos', {
  /** UUID generado en el celular. */
  id: uuid('id').primaryKey(),
  finca_id: uuid('finca_id')
    .notNull()
    .references(() => fincas.id),
  nombre: text('nombre').notNull(),
  modelo: text('modelo'),
  sistema: text('sistema'),
  version_app: text('version_app'),
  estado: text('estado').notNull().default('activo'),
  ultimo_sync: ms('ultimo_sync'),
  registros_pendientes: integer('registros_pendientes').notNull().default(0),
  archivos_pendientes: integer('archivos_pendientes').notNull().default(0),
  clave_respaldo: text('clave_respaldo').notNull(),
  registrado_por: uuid('registrado_por'),
  created_at: ms('created_at').notNull(),
  updated_at: ms('updated_at').notNull(),
});

// ─── Usuarios y permisos ──────────────────────────────────────────────────
export const roles = pgTable(
  'roles',
  {
    ...comunes(),
    codigo: text('codigo').notNull().unique(),
    nombre: text('nombre').notNull(),
    plataformas: jsonb('plataformas').notNull(),
  },
  idxSync('roles'),
);

export const permisos = pgTable(
  'permisos',
  {
    ...comunes(),
    codigo: text('codigo').notNull().unique(),
    modulo: text('modulo').notNull(),
    accion: text('accion').notNull(),
    descripcion: text('descripcion').notNull(),
  },
  idxSync('permisos'),
);

export const rol_permisos = pgTable(
  'rol_permisos',
  {
    ...comunes(),
    rol_id: uuid('rol_id')
      .notNull()
      .references(() => roles.id),
    permiso_id: uuid('permiso_id')
      .notNull()
      .references(() => permisos.id),
  },
  (t) => [...idxSync('rol_permisos')(t), uniqueIndex('rol_permiso_uq').on(t.rol_id, t.permiso_id)],
);

export const trabajadores = pgTable(
  'trabajadores',
  {
    ...comunes(),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    dpi: text('dpi').notNull().unique(),
    cuadrilla_id: uuid('cuadrilla_id'),
    activo: boolean('activo').notNull().default(true),
  },
  idxSync('trabajadores'),
);

export const usuarios = pgTable(
  'usuarios',
  {
    ...comunes(),
    empresa_id: uuid('empresa_id')
      .notNull()
      .references(() => empresas.id),
    usuario: text('usuario').notNull().unique(),
    nombre: text('nombre').notNull(),
    rol_id: uuid('rol_id')
      .notNull()
      .references(() => roles.id),
    /** bcrypt del PIN (solo servidor). */
    pin_hash: text('pin_hash').notNull(),
    pin_offline_hash: text('pin_offline_hash').notNull(),
    pin_offline_sal: text('pin_offline_sal').notNull(),
    gafete_hash: text('gafete_hash'),
    trabajador_id: uuid('trabajador_id').references(() => trabajadores.id),
    activo: boolean('activo').notNull().default(true),
  },
  idxSync('usuarios'),
);

export const cuadrillas = pgTable(
  'cuadrillas',
  {
    ...comunes(),
    nombre: text('nombre').notNull(),
    caporal_id: uuid('caporal_id').references(() => usuarios.id),
  },
  idxSync('cuadrillas'),
);

export const cuadrilla_miembros = pgTable(
  'cuadrilla_miembros',
  {
    ...comunes(),
    cuadrilla_id: uuid('cuadrilla_id')
      .notNull()
      .references(() => cuadrillas.id),
    trabajador_id: uuid('trabajador_id')
      .notNull()
      .references(() => trabajadores.id),
  },
  idxSync('cuadrilla_miembros'),
);

export const consentimientos = pgTable(
  'consentimientos',
  {
    ...comunes(),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    tipo: text('tipo').notNull(),
    version_texto: text('version_texto').notNull(),
    aceptado: boolean('aceptado').notNull(),
  },
  idxSync('consentimientos'),
);

export const refresh_tokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** usuario o dispositivo */
    sujeto_tipo: text('sujeto_tipo').notNull(),
    sujeto_id: uuid('sujeto_id').notNull(),
    hash: text('hash').notNull().unique(),
    expira_en: ms('expira_en').notNull(),
    revocado_en: ms('revocado_en'),
    created_at: ms('created_at').notNull(),
  },
  (t) => [index('refresh_sujeto_idx').on(t.sujeto_tipo, t.sujeto_id)],
);

// ─── Calendario ───────────────────────────────────────────────────────────
export const colores_cinta = pgTable(
  'colores_cinta',
  {
    ...comunes(),
    nombre: text('nombre').notNull(),
    hex: text('hex').notNull(),
    orden: integer('orden').notNull(),
    pendiente_confirmar: boolean('pendiente_confirmar').notNull().default(true),
  },
  idxSync('colores_cinta'),
);

export const semanas = pgTable(
  'semanas',
  {
    ...comunes(),
    anio: integer('anio').notNull(),
    numero: integer('numero').notNull(),
    fecha_inicio: date('fecha_inicio', { mode: 'string' }).notNull(),
    fecha_fin: date('fecha_fin', { mode: 'string' }).notNull(),
    color_cinta_id: uuid('color_cinta_id')
      .notNull()
      .references(() => colores_cinta.id),
    factor: doublePrecision('factor').notNull(),
  },
  (t) => [...idxSync('semanas')(t), uniqueIndex('semana_uq').on(t.finca_id, t.anio, t.numero)],
);

// ─── Sanidad ──────────────────────────────────────────────────────────────
export const plagas = pgTable(
  'plagas',
  {
    ...comunes(),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    nombre_cientifico: text('nombre_cientifico'),
    tipo: text('tipo').notNull(),
    umbral_alerta: doublePrecision('umbral_alerta').notNull(),
    activo: boolean('activo').notNull().default(true),
  },
  idxSync('plagas'),
);

export const definiciones_formulario = pgTable(
  'definiciones_formulario',
  {
    ...comunes(),
    codigo: text('codigo').notNull(),
    version: integer('version').notNull(),
    titulo: text('titulo').notNull(),
    definicion: jsonb('definicion').notNull(),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [
    ...idxSync('definiciones_formulario')(t),
    uniqueIndex('formulario_version_uq').on(t.codigo, t.version),
  ],
);

export const muestreos = pgTable(
  'muestreos',
  {
    ...comunes(),
    ...gps(),
    lote_id: uuid('lote_id')
      .notNull()
      .references(() => lotes.id),
    plaga_id: uuid('plaga_id')
      .notNull()
      .references(() => plagas.id),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    incidencia: doublePrecision('incidencia').notNull(),
    severidad: text('severidad').notNull(),
    respuestas: jsonb('respuestas').notNull(),
    formulario_id: uuid('formulario_id'),
    formulario_version: integer('formulario_version').notNull(),
    notas: text('notas'),
  },
  (t) => [...idxSync('muestreos')(t), index('muestreos_lote_fecha_idx').on(t.lote_id, t.fecha)],
);

export const preaviso_sigatoka = pgTable(
  'preaviso_sigatoka',
  {
    ...comunes(),
    ...gps(),
    lote_id: uuid('lote_id')
      .notNull()
      .references(() => lotes.id),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    anio: integer('anio').notNull(),
    semana: integer('semana').notNull(),
    plantas_muestreadas: integer('plantas_muestreadas').notNull(),
    hoja_mas_joven_enferma: doublePrecision('hoja_mas_joven_enferma').notNull(),
    estado_evolucion: doublePrecision('estado_evolucion').notNull(),
    severidad: doublePrecision('severidad').notNull(),
    notas: text('notas'),
  },
  idxSync('preaviso_sigatoka'),
);

export const trampas = pgTable(
  'trampas',
  {
    ...comunes(),
    lote_id: uuid('lote_id')
      .notNull()
      .references(() => lotes.id),
    codigo_qr: text('codigo_qr').notNull().unique(),
    nombre: text('nombre').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    activa: boolean('activa').notNull().default(true),
    geom: geometry('geom', { type: 'point', srid: 4326 }).generatedAlwaysAs(
      sql`ST_SetSRID(ST_MakePoint(lng, lat), 4326)`,
    ),
  },
  idxSync('trampas'),
);

export const lecturas_trampa = pgTable(
  'lecturas_trampa',
  {
    ...comunes(),
    ...gps(),
    trampa_id: uuid('trampa_id')
      .notNull()
      .references(() => trampas.id),
    lote_id: uuid('lote_id')
      .notNull()
      .references(() => lotes.id),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    cantidad: integer('cantidad').notNull(),
    notas: text('notas'),
  },
  idxSync('lecturas_trampa'),
);

export const alertas_fusarium = pgTable(
  'alertas_fusarium',
  {
    ...comunes(),
    ...gps(),
    ...validacion(),
    lote_id: uuid('lote_id').references(() => lotes.id),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    sintomas: jsonb('sintomas').notNull(),
    estado: text('estado').notNull().default('sospecha'),
    notas: text('notas'),
  },
  idxSync('alertas_fusarium'),
);

// ─── Producción ───────────────────────────────────────────────────────────
export const enfunde = pgTable(
  'enfunde',
  {
    ...comunes(),
    ...gps(),
    lote_id: uuid('lote_id')
      .notNull()
      .references(() => lotes.id),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    anio: integer('anio').notNull(),
    semana: integer('semana').notNull(),
    color_cinta_id: uuid('color_cinta_id')
      .notNull()
      .references(() => colores_cinta.id),
    racimos: integer('racimos').notNull(),
    cuadrilla_id: uuid('cuadrilla_id'),
    trabajador_id: uuid('trabajador_id'),
  },
  (t) => [...idxSync('enfunde')(t), index('enfunde_semana_idx').on(t.anio, t.semana)],
);

export const cosecha = pgTable(
  'cosecha',
  {
    ...comunes(),
    ...gps(),
    ...validacion(),
    lote_id: uuid('lote_id')
      .notNull()
      .references(() => lotes.id),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    anio: integer('anio').notNull(),
    semana: integer('semana').notNull(),
    color_cinta_id: uuid('color_cinta_id')
      .notNull()
      .references(() => colores_cinta.id),
    racimos_cosechados: integer('racimos_cosechados').notNull(),
    racimos_perdidos: integer('racimos_perdidos').notNull(),
    motivo_perdida: text('motivo_perdida'),
    cuadrilla_id: uuid('cuadrilla_id'),
  },
  (t) => [...idxSync('cosecha')(t), index('cosecha_semana_idx').on(t.anio, t.semana)],
);

export const conteos_cinta = pgTable(
  'conteos_cinta',
  {
    ...comunes(),
    ...gps(),
    lote_id: uuid('lote_id')
      .notNull()
      .references(() => lotes.id),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    anio: integer('anio').notNull(),
    semana: integer('semana').notNull(),
    color_cinta_id: uuid('color_cinta_id')
      .notNull()
      .references(() => colores_cinta.id),
    racimos: integer('racimos').notNull(),
    origen: text('origen').notNull(),
  },
  idxSync('conteos_cinta'),
);

/** Instantáneas del pronóstico semanal generadas desde el panel (solo servidor). */
export const pronosticos = pgTable('pronosticos', {
  id: uuid('id').primaryKey().defaultRandom(),
  finca_id: uuid('finca_id')
    .notNull()
    .references(() => fincas.id),
  generado_en: ms('generado_en').notNull(),
  generado_por: uuid('generado_por'),
  anio: integer('anio').notNull(),
  semana: integer('semana').notNull(),
  racimos: doublePrecision('racimos').notNull(),
  factor: doublePrecision('factor').notNull(),
  cajas: doublePrecision('cajas').notNull(),
  detalle: jsonb('detalle').notNull(),
});

// ─── Personas ─────────────────────────────────────────────────────────────
export const tipos_labor = pgTable(
  'tipos_labor',
  {
    ...comunes(),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    unidad: text('unidad').notNull(),
    tarifa: doublePrecision('tarifa'),
    activo: boolean('activo').notNull().default(true),
  },
  idxSync('tipos_labor'),
);

export const asistencia = pgTable(
  'asistencia',
  {
    ...comunes(),
    ...gps(),
    trabajador_id: uuid('trabajador_id')
      .notNull()
      .references(() => trabajadores.id),
    cuadrilla_id: uuid('cuadrilla_id'),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    presente: boolean('presente').notNull(),
    hora_entrada: ms('hora_entrada'),
  },
  idxSync('asistencia'),
);

export const labores = pgTable(
  'labores',
  {
    ...comunes(),
    ...gps(),
    ...validacion(),
    tipo_labor_id: uuid('tipo_labor_id')
      .notNull()
      .references(() => tipos_labor.id),
    lote_id: uuid('lote_id')
      .notNull()
      .references(() => lotes.id),
    trabajador_id: uuid('trabajador_id'),
    cuadrilla_id: uuid('cuadrilla_id'),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    cantidad: doublePrecision('cantidad').notNull(),
    notas: text('notas'),
  },
  idxSync('labores'),
);

export const asignaciones_labor = pgTable(
  'asignaciones_labor',
  {
    ...comunes(),
    tipo_labor_id: uuid('tipo_labor_id')
      .notNull()
      .references(() => tipos_labor.id),
    lote_id: uuid('lote_id')
      .notNull()
      .references(() => lotes.id),
    trabajador_id: uuid('trabajador_id').notNull(),
    cuadrilla_id: uuid('cuadrilla_id'),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    meta: doublePrecision('meta'),
    estado: text('estado').notNull().default('asignada'),
    labor_id: uuid('labor_id'),
    notas: text('notas'),
  },
  idxSync('asignaciones_labor'),
);

// ─── GPS ──────────────────────────────────────────────────────────────────
export const rutas = pgTable(
  'rutas',
  {
    ...comunes(),
    usuario_id: uuid('usuario_id').notNull(),
    orden_trabajo_id: uuid('orden_trabajo_id'),
    lote_id: uuid('lote_id'),
    tarea: text('tarea').notNull(),
    inicio: ms('inicio').notNull(),
    fin: ms('fin'),
    estado: text('estado').notNull(),
    distancia_m: doublePrecision('distancia_m').notNull().default(0),
    puntos: integer('puntos').notNull().default(0),
  },
  idxSync('rutas'),
);

export const puntos_ruta = pgTable(
  'puntos_ruta',
  {
    ...comunes(),
    ruta_id: uuid('ruta_id')
      .notNull()
      .references(() => rutas.id),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    precision_gps: doublePrecision('precision_gps').notNull(),
    hora_gps: ms('hora_gps').notNull(),
    secuencia: integer('secuencia').notNull(),
    geom: geometry('geom', { type: 'point', srid: 4326 }).generatedAlwaysAs(
      sql`ST_SetSRID(ST_MakePoint(lng, lat), 4326)`,
    ),
  },
  (t) => [
    ...idxSync('puntos_ruta')(t),
    index('puntos_ruta_ruta_idx').on(t.ruta_id, t.secuencia),
    index('puntos_ruta_geom_idx').using('gist', t.geom),
  ],
);

export const cobertura_lote = pgTable(
  'cobertura_lote',
  {
    ...comunes(),
    lote_id: uuid('lote_id')
      .notNull()
      .references(() => lotes.id),
    anio: integer('anio').notNull(),
    semana: integer('semana').notNull(),
    celdas_total: integer('celdas_total').notNull(),
    celdas_recorridas: integer('celdas_recorridas').notNull(),
    porcentaje: doublePrecision('porcentaje').notNull(),
    celdas: jsonb('celdas').notNull(),
  },
  (t) => [
    ...idxSync('cobertura_lote')(t),
    uniqueIndex('cobertura_uq').on(t.lote_id, t.anio, t.semana),
  ],
);

// ─── Tareas ───────────────────────────────────────────────────────────────
export const ordenes_trabajo = pgTable(
  'ordenes_trabajo',
  {
    ...comunes(),
    titulo: text('titulo').notNull(),
    descripcion: text('descripcion'),
    modulo: text('modulo').notNull(),
    lote_id: uuid('lote_id'),
    asignado_a: uuid('asignado_a')
      .notNull()
      .references(() => usuarios.id),
    asignado_por: uuid('asignado_por'),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    estado: text('estado').notNull().default('pendiente'),
  },
  idxSync('ordenes_trabajo'),
);

// ─── Archivos ─────────────────────────────────────────────────────────────
export const archivos = pgTable(
  'archivos',
  {
    ...comunes(),
    tipo: text('tipo').notNull(),
    mime: text('mime').notNull(),
    tamano_bytes: integer('tamano_bytes').notNull(),
    ancho: doublePrecision('ancho'),
    alto: doublePrecision('alto'),
    registro_tabla: text('registro_tabla').notNull(),
    registro_id: uuid('registro_id').notNull(),
    estado_subida: text('estado_subida').notNull().default('pendiente'),
    clave_s3: text('clave_s3'),
    uri_local: text('uri_local'),
  },
  (t) => [
    ...idxSync('archivos')(t),
    index('archivos_registro_idx').on(t.registro_tabla, t.registro_id),
  ],
);

// ─── Plataforma ───────────────────────────────────────────────────────────
export const modulos = pgTable(
  'modulos',
  {
    ...comunes(),
    codigo: text('codigo').notNull().unique(),
    nombre: text('nombre').notNull(),
    activo: boolean('activo').notNull().default(true),
    orden: doublePrecision('orden').notNull(),
  },
  idxSync('modulos'),
);

export const feature_flags = pgTable(
  'feature_flags',
  {
    ...comunes(),
    codigo: text('codigo').notNull(),
    rol_id: uuid('rol_id').references(() => roles.id),
    activo: boolean('activo').notNull(),
  },
  idxSync('feature_flags'),
);

export const parametros = pgTable(
  'parametros',
  {
    ...comunes(),
    clave: text('clave').notNull(),
    valor: jsonb('valor').notNull(),
    descripcion: text('descripcion').notNull(),
    pendiente: boolean('pendiente').notNull().default(false),
  },
  (t) => [...idxSync('parametros')(t), uniqueIndex('parametro_uq').on(t.finca_id, t.clave)],
);

/** Bitácora de auditoría y conflictos (solo servidor). */
export const bitacora = pgTable(
  'bitacora',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    finca_id: uuid('finca_id'),
    usuario_id: uuid('usuario_id'),
    dispositivo_id: text('dispositivo_id'),
    accion: text('accion').notNull(),
    tabla: text('tabla'),
    registro_id: text('registro_id'),
    datos: jsonb('datos'),
    /** Solo para conflictos: pendiente de revisión del supervisor. */
    requiere_revision: boolean('requiere_revision').notNull().default(false),
    resuelto_por: uuid('resuelto_por'),
    resuelto_en: ms('resuelto_en'),
    created_at: ms('created_at').notNull(),
  },
  (t) => [
    index('bitacora_registro_idx').on(t.tabla, t.registro_id),
    index('bitacora_revision_idx').on(t.requiere_revision, t.created_at),
  ],
);
