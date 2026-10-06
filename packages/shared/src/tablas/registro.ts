/**
 * Registro de tablas sincronizables entre el celular (WatermelonDB) y el servidor (PostgreSQL).
 *
 * Para agregar una tabla nueva:
 *  1. Declárela aquí.
 *  2. Agregue la tabla equivalente en `apps/api/src/db/esquema.ts` y genere la migración.
 *  3. Suba la versión del esquema local en `apps/mobile/src/db/migraciones.ts`.
 * La prueba `apps/api/test/consistencia-esquema.test.ts` verifica que ambos lados coincidan.
 */
import {
  ESTADOS_FUSARIUM,
  ESTADOS_ASIGNACION,
  ESTADOS_ORDEN,
  ESTADOS_RUTA,
  ESTADOS_SUBIDA,
  SEVERIDADES,
  TIPOS_ARCHIVO,
  TIPOS_PLAGA,
  UNIDADES_AREA,
  UNIDADES_LABOR,
} from '../constantes';
import type { DefColumna, DefTabla } from './tipos';

type Opciones = Omit<DefColumna, 'tipo'>;
// `const` conserva los literales (p. ej. opcional: true) para tipar las filas.
const texto = <const O extends Opciones = Record<never, never>>(o?: O) =>
  ({ tipo: 'texto', ...o }) as { tipo: 'texto' } & O;
const numero = <const O extends Opciones = Record<never, never>>(o?: O) =>
  ({ tipo: 'numero', ...o }) as { tipo: 'numero' } & O;
const booleano = <const O extends Opciones = Record<never, never>>(o?: O) =>
  ({ tipo: 'booleano', ...o }) as { tipo: 'booleano' } & O;
const json = <const O extends Opciones = Record<never, never>>(o?: O) =>
  ({ tipo: 'json', ...o }) as { tipo: 'json' } & O;

const ref = <const O extends Opciones = Record<never, never>>(o?: O) =>
  texto({ indexado: true, ...o } as { indexado: true } & O);

export const REGISTRO_TABLAS = {
  // ─── Organización ────────────────────────────────────────────────────────
  empresas: {
    meta: { direccion: 'bajada', etiqueta: 'Empresas' },
    columnas: { nombre: texto(), codigo: texto() },
  },
  fincas: {
    meta: { direccion: 'bajada', etiqueta: 'Fincas' },
    columnas: {
      empresa_id: ref(),
      nombre: texto(),
      codigo: texto(),
      unidad_area: texto({ valores: UNIDADES_AREA }),
      centro_lat: numero(),
      centro_lng: numero(),
      /** [minLng, minLat, maxLng, maxLat] para descargar el mapa offline. */
      bbox: json(),
    },
  },
  lotes: {
    meta: { direccion: 'bajada', porFinca: true, etiqueta: 'Lotes' },
    columnas: {
      codigo: texto(),
      nombre: texto(),
      hectareas: numero({ min: 0 }),
      /** Plantas productivas por hectárea. */
      poblacion: numero({ min: 0 }),
      /** Geometría GeoJSON (Polygon, EPSG:4326). */
      poligono: json(),
    },
  },

  // ─── Usuarios y permisos ────────────────────────────────────────────────
  usuarios: {
    meta: { direccion: 'bajada', porFinca: true, etiqueta: 'Usuarios' },
    columnas: {
      empresa_id: ref(),
      usuario: texto({ indexado: true }),
      nombre: texto(),
      rol_id: ref(),
      /** PBKDF2 del PIN para iniciar sesión sin señal. */
      pin_offline_hash: texto(),
      pin_offline_sal: texto(),
      /** SHA-256 del código del gafete QR. */
      gafete_hash: texto({ opcional: true, indexado: true }),
      trabajador_id: ref({ opcional: true }),
      activo: booleano(),
    },
  },
  roles: {
    meta: { direccion: 'bajada', etiqueta: 'Roles' },
    columnas: { codigo: texto(), nombre: texto(), plataformas: json() },
  },
  permisos: {
    meta: { direccion: 'bajada', etiqueta: 'Permisos' },
    columnas: { codigo: texto(), modulo: texto(), accion: texto(), descripcion: texto() },
  },
  rol_permisos: {
    meta: { direccion: 'bajada', etiqueta: 'Permisos por rol' },
    columnas: { rol_id: ref(), permiso_id: ref() },
  },
  cuadrillas: {
    meta: { direccion: 'bajada', porFinca: true, etiqueta: 'Cuadrillas' },
    columnas: { nombre: texto(), caporal_id: ref({ opcional: true }) },
  },
  cuadrilla_miembros: {
    meta: { direccion: 'bajada', porFinca: true, etiqueta: 'Miembros de cuadrilla' },
    columnas: { cuadrilla_id: ref(), trabajador_id: ref() },
  },
  consentimientos: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      etiqueta: 'Consentimientos',
      permisos: { crear: 'perfil:usar' },
    },
    columnas: {
      usuario_id: ref(),
      tipo: texto(),
      version_texto: texto(),
      aceptado: booleano(),
    },
  },

  // ─── Calendario ─────────────────────────────────────────────────────────
  colores_cinta: {
    meta: { direccion: 'bajada', etiqueta: 'Colores de cinta' },
    columnas: {
      nombre: texto(),
      hex: texto(),
      orden: numero({ entero: true }),
      /** Los colores reales del ciclo están pendientes de confirmar por la finca. */
      pendiente_confirmar: booleano(),
    },
  },
  semanas: {
    meta: { direccion: 'bajada', etiqueta: 'Semanas' },
    columnas: {
      anio: numero({ entero: true, indexado: true }),
      numero: numero({ entero: true, min: 1, max: 53, indexado: true }),
      fecha_inicio: texto(),
      fecha_fin: texto(),
      color_cinta_id: ref(),
      /** Cajas por racimo para la semana (interpolado y editable). */
      factor: numero({ min: 0 }),
    },
  },

  // ─── Sanidad ────────────────────────────────────────────────────────────
  plagas: {
    meta: { direccion: 'bajada', etiqueta: 'Plagas y enfermedades' },
    columnas: {
      codigo: texto(),
      nombre: texto(),
      nombre_cientifico: texto({ opcional: true }),
      tipo: texto({ valores: TIPOS_PLAGA }),
      /** Incidencia (%) a partir de la cual el lote pasa a ALERTA. Ejemplo editable. */
      umbral_alerta: numero({ min: 0 }),
      activo: booleano(),
    },
  },
  muestreos: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      conGps: true,
      etiqueta: 'Muestreos de plagas',
      permisos: { crear: 'plagas:crear', editar: 'plagas:editar' },
    },
    columnas: {
      lote_id: ref(),
      plaga_id: ref(),
      fecha: texto({ indexado: true }),
      incidencia: numero({ min: 0, max: 100 }),
      severidad: texto({ valores: SEVERIDADES }),
      /** Respuestas del formulario dinámico (JSON). */
      respuestas: json(),
      formulario_id: ref({ opcional: true }),
      formulario_version: numero({ entero: true }),
      notas: texto({ opcional: true }),
    },
  },
  preaviso_sigatoka: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      conGps: true,
      etiqueta: 'Preaviso de sigatoka',
      permisos: { crear: 'plagas:crear', editar: 'plagas:editar' },
    },
    columnas: {
      lote_id: ref(),
      fecha: texto({ indexado: true }),
      anio: numero({ entero: true }),
      semana: numero({ entero: true, min: 1, max: 53 }),
      plantas_muestreadas: numero({ entero: true, min: 1 }),
      /** Hoja más joven enferma (promedio). */
      hoja_mas_joven_enferma: numero({ min: 0, max: 20 }),
      /** Estado de evolución (EE). */
      estado_evolucion: numero({ min: 0 }),
      severidad: numero({ min: 0, max: 100 }),
      notas: texto({ opcional: true }),
    },
  },
  trampas: {
    meta: { direccion: 'bajada', porFinca: true, etiqueta: 'Trampas de picudo' },
    columnas: {
      lote_id: ref(),
      codigo_qr: texto({ indexado: true }),
      nombre: texto(),
      lat: numero(),
      lng: numero(),
      activa: booleano(),
    },
  },
  lecturas_trampa: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      conGps: true,
      etiqueta: 'Lecturas de trampa',
      permisos: { crear: 'trampas:crear', editar: 'trampas:editar' },
    },
    columnas: {
      trampa_id: ref(),
      lote_id: ref(),
      fecha: texto({ indexado: true }),
      cantidad: numero({ entero: true, min: 0 }),
      notas: texto({ opcional: true }),
    },
  },
  alertas_fusarium: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      conGps: true,
      critica: true,
      etiqueta: 'Alertas de Fusarium',
      permisos: { crear: 'fusarium:crear', editar: 'fusarium:editar' },
    },
    columnas: {
      lote_id: ref({ opcional: true }),
      fecha: texto({ indexado: true }),
      /** Códigos de SINTOMAS_FUSARIUM (JSON array). */
      sintomas: json(),
      estado: texto({ valores: ESTADOS_FUSARIUM }),
      notas: texto({ opcional: true }),
    },
  },

  // ─── Producción ─────────────────────────────────────────────────────────
  enfunde: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      conGps: true,
      etiqueta: 'Enfunde',
      permisos: { crear: 'enfunde:crear', editar: 'enfunde:editar' },
    },
    columnas: {
      lote_id: ref(),
      fecha: texto({ indexado: true }),
      anio: numero({ entero: true }),
      semana: numero({ entero: true, min: 1, max: 53 }),
      color_cinta_id: ref(),
      racimos: numero({ entero: true, min: 0 }),
      cuadrilla_id: ref({ opcional: true }),
      trabajador_id: ref({ opcional: true }),
    },
  },
  cosecha: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      conGps: true,
      critica: true,
      etiqueta: 'Cosecha',
      permisos: { crear: 'cosecha:crear', editar: 'cosecha:editar' },
    },
    columnas: {
      lote_id: ref(),
      fecha: texto({ indexado: true }),
      anio: numero({ entero: true }),
      semana: numero({ entero: true, min: 1, max: 53 }),
      color_cinta_id: ref(),
      racimos_cosechados: numero({ entero: true, min: 0 }),
      racimos_perdidos: numero({ entero: true, min: 0 }),
      motivo_perdida: texto({ opcional: true }),
      cuadrilla_id: ref({ opcional: true }),
    },
  },
  conteos_cinta: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      conGps: true,
      etiqueta: 'Conteo de cintas',
      permisos: { crear: 'conteo_cintas:crear' },
    },
    columnas: {
      lote_id: ref(),
      fecha: texto(),
      anio: numero({ entero: true }),
      semana: numero({ entero: true, min: 1, max: 53 }),
      color_cinta_id: ref(),
      racimos: numero({ entero: true, min: 0 }),
      origen: texto(),
    },
  },

  // ─── Personas ───────────────────────────────────────────────────────────
  trabajadores: {
    meta: { direccion: 'bajada', porFinca: true, etiqueta: 'Trabajadores' },
    columnas: {
      codigo: texto(),
      nombre: texto(),
      /** DPI único. En el demo son DPI de prueba. */
      dpi: texto(),
      cuadrilla_id: ref({ opcional: true }),
      activo: booleano(),
    },
  },
  tipos_labor: {
    meta: { direccion: 'bajada', etiqueta: 'Tipos de labor' },
    columnas: {
      codigo: texto(),
      nombre: texto(),
      unidad: texto({ valores: UNIDADES_LABOR }),
      /** Tarifa por unidad (destajo). Pendiente de definir por la finca. */
      tarifa: numero({ opcional: true, min: 0 }),
      activo: booleano(),
    },
  },
  asistencia: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      conGps: true,
      etiqueta: 'Asistencia',
      permisos: { crear: 'labores:crear', editar: 'labores:editar' },
    },
    columnas: {
      trabajador_id: ref(),
      cuadrilla_id: ref({ opcional: true }),
      fecha: texto({ indexado: true }),
      presente: booleano(),
      hora_entrada: numero({ opcional: true }),
    },
  },
  labores: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      conGps: true,
      critica: true,
      etiqueta: 'Labores',
      permisos: { crear: 'labores:crear', editar: 'labores:editar' },
    },
    columnas: {
      tipo_labor_id: ref(),
      lote_id: ref(),
      trabajador_id: ref({ opcional: true }),
      cuadrilla_id: ref({ opcional: true }),
      fecha: texto({ indexado: true }),
      cantidad: numero({ min: 0 }),
      notas: texto({ opcional: true }),
    },
  },
  asignaciones_labor: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      etiqueta: 'Asignaciones de labor',
      permisos: { crear: 'labores:crear', editar: 'labores:crear' },
    },
    columnas: {
      tipo_labor_id: ref(),
      lote_id: ref(),
      trabajador_id: ref(),
      cuadrilla_id: ref({ opcional: true }),
      fecha: texto({ indexado: true }),
      /** Cantidad esperada en la unidad del tipo de labor (opcional). */
      meta: numero({ opcional: true, min: 0 }),
      estado: texto({ valores: ESTADOS_ASIGNACION }),
      /** Registro de `labores` creado al reportar. */
      labor_id: ref({ opcional: true }),
      notas: texto({ opcional: true }),
    },
  },

  // ─── GPS ────────────────────────────────────────────────────────────────
  rutas: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      etiqueta: 'Rutas GPS',
      permisos: { crear: 'rutas:crear' },
    },
    columnas: {
      usuario_id: ref(),
      orden_trabajo_id: ref({ opcional: true }),
      lote_id: ref({ opcional: true }),
      tarea: texto(),
      inicio: numero(),
      fin: numero({ opcional: true }),
      estado: texto({ valores: ESTADOS_RUTA }),
      distancia_m: numero({ min: 0 }),
      puntos: numero({ entero: true, min: 0 }),
    },
  },
  puntos_ruta: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      etiqueta: 'Puntos de ruta',
      permisos: { crear: 'rutas:crear' },
    },
    columnas: {
      ruta_id: ref(),
      lat: numero({ min: -90, max: 90 }),
      lng: numero({ min: -180, max: 180 }),
      precision_gps: numero({ min: 0 }),
      hora_gps: numero(),
      secuencia: numero({ entero: true, min: 0 }),
    },
  },
  cobertura_lote: {
    meta: { direccion: 'bajada', porFinca: true, etiqueta: 'Cobertura por lote' },
    columnas: {
      lote_id: ref(),
      anio: numero({ entero: true }),
      semana: numero({ entero: true }),
      celdas_total: numero({ entero: true }),
      celdas_recorridas: numero({ entero: true }),
      porcentaje: numero(),
      /** Celdas recorridas (GeoJSON MultiPolygon). */
      celdas: json(),
    },
  },

  // ─── Tareas ─────────────────────────────────────────────────────────────
  ordenes_trabajo: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      etiqueta: 'Órdenes de trabajo',
      permisos: { crear: 'ordenes:crear', editar: 'ordenes:actualizar' },
    },
    columnas: {
      titulo: texto(),
      descripcion: texto({ opcional: true }),
      modulo: texto(),
      lote_id: ref({ opcional: true }),
      asignado_a: ref(),
      asignado_por: ref({ opcional: true }),
      fecha: texto({ indexado: true }),
      estado: texto({ valores: ESTADOS_ORDEN }),
    },
  },

  // ─── Archivos ───────────────────────────────────────────────────────────
  archivos: {
    meta: {
      direccion: 'ambas',
      porFinca: true,
      etiqueta: 'Archivos',
      permisos: { crear: 'archivos:crear' },
    },
    columnas: {
      tipo: texto({ valores: TIPOS_ARCHIVO }),
      mime: texto(),
      tamano_bytes: numero({ entero: true, min: 0 }),
      ancho: numero({ opcional: true }),
      alto: numero({ opcional: true }),
      registro_tabla: texto(),
      registro_id: ref(),
      estado_subida: texto({ valores: ESTADOS_SUBIDA }),
      clave_s3: texto({ opcional: true }),
      /** Ruta local del archivo en el celular (no se usa en el servidor). */
      uri_local: texto({ opcional: true }),
    },
  },

  // ─── Plataforma ─────────────────────────────────────────────────────────
  modulos: {
    meta: { direccion: 'bajada', etiqueta: 'Módulos' },
    columnas: { codigo: texto(), nombre: texto(), activo: booleano(), orden: numero() },
  },
  definiciones_formulario: {
    meta: { direccion: 'bajada', etiqueta: 'Definiciones de formulario' },
    columnas: {
      codigo: texto({ indexado: true }),
      version: numero({ entero: true }),
      titulo: texto(),
      definicion: json(),
      activo: booleano(),
    },
  },
  feature_flags: {
    meta: { direccion: 'bajada', etiqueta: 'Feature flags' },
    columnas: {
      codigo: texto(),
      rol_id: ref({ opcional: true }),
      activo: booleano(),
    },
  },
  parametros: {
    meta: { direccion: 'bajada', etiqueta: 'Parámetros' },
    columnas: {
      clave: texto({ indexado: true }),
      valor: json(),
      descripcion: texto(),
      pendiente: booleano(),
    },
  },
} as const satisfies Record<string, DefTabla>;

export type NombreTabla = keyof typeof REGISTRO_TABLAS;

export const NOMBRES_TABLAS = Object.keys(REGISTRO_TABLAS) as NombreTabla[];

export const TABLAS_SUBIDA = NOMBRES_TABLAS.filter(
  (t) => REGISTRO_TABLAS[t].meta.direccion === 'ambas',
);

export const TABLAS_CRITICAS = NOMBRES_TABLAS.filter(
  (t) => (REGISTRO_TABLAS[t].meta as { critica?: boolean }).critica === true,
);

export function esTablaSincronizable(nombre: string): nombre is NombreTabla {
  return Object.prototype.hasOwnProperty.call(REGISTRO_TABLAS, nombre);
}
