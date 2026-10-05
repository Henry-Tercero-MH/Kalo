/**
 * Constantes de dominio compartidas por móvil, web y API.
 * Los valores de negocio editables (umbrales, factores, intervalos) NO viven aquí:
 * se guardan en la tabla `parametros` (ver `parametros.ts`).
 */

export const ESTADOS_VALIDACION = ['pendiente', 'validado', 'rechazado'] as const;
export type EstadoValidacion = (typeof ESTADOS_VALIDACION)[number];

export const ESTADOS_FUSARIUM = ['sospecha', 'en_revision', 'descartada', 'confirmada'] as const;
export type EstadoFusarium = (typeof ESTADOS_FUSARIUM)[number];

export const ESTADOS_ORDEN = ['pendiente', 'en_progreso', 'completada', 'cancelada'] as const;
export type EstadoOrden = (typeof ESTADOS_ORDEN)[number];

export const ESTADOS_RUTA = ['activa', 'finalizada'] as const;

export const ESTADOS_SUBIDA = ['pendiente', 'subiendo', 'subido', 'error'] as const;
export type EstadoSubida = (typeof ESTADOS_SUBIDA)[number];

export const TIPOS_ARCHIVO = ['foto', 'audio', 'documento'] as const;
export type TipoArchivo = (typeof TIPOS_ARCHIVO)[number];

export const ESTADOS_DISPOSITIVO = [
  'activo',
  'bloqueado',
  'borrado_solicitado',
  'borrado',
] as const;
export type EstadoDispositivo = (typeof ESTADOS_DISPOSITIVO)[number];

export const UNIDADES_AREA = ['ha', 'mz'] as const;
export type UnidadArea = (typeof UNIDADES_AREA)[number];

export const UNIDADES_LABOR = ['racimos', 'plantas', 'metros', 'hectareas', 'jornal'] as const;

export const TIPOS_PLAGA = ['plaga', 'enfermedad'] as const;

/** Severidad de muestreo (escala simple, editable en el formulario dinámico). */
export const SEVERIDADES = ['baja', 'media', 'alta'] as const;

/** Síntomas marcables en la alerta de Fusarium R4T. */
export const SINTOMAS_FUSARIUM = [
  { codigo: 'amarillamiento_hojas_viejas', etiqueta: 'Amarillamiento de hojas viejas' },
  { codigo: 'marchitez', etiqueta: 'Marchitez' },
  { codigo: 'hojas_colgantes', etiqueta: 'Hojas colgando (quebradas en el pecíolo)' },
  { codigo: 'agrietamiento_pseudotallo', etiqueta: 'Agrietamiento del pseudotallo' },
  { codigo: 'decoloracion_vascular', etiqueta: 'Decoloración vascular (rojiza/café)' },
  { codigo: 'hijos_afectados', etiqueta: 'Hijos afectados' },
] as const;

/** Acciones registradas en la bitácora. */
export const ACCIONES_BITACORA = [
  'crear',
  'editar',
  'borrar',
  'validar',
  'rechazar',
  'conflicto',
  'resolver_conflicto',
  'login',
  'registrar_dispositivo',
  'borrado_remoto',
] as const;
export type AccionBitacora = (typeof ACCIONES_BITACORA)[number];

/** Códigos de rol del demo. Los permisos de cada rol viven en la base de datos. */
export const ROLES = {
  administrador: 'administrador',
  gerente: 'gerente',
  supervisor: 'supervisor',
  tecnico_sanidad: 'tecnico_sanidad',
  caporal: 'caporal',
  trabajador: 'trabajador',
} as const;
export type CodigoRol = (typeof ROLES)[keyof typeof ROLES];

/** Prefijo con el que se marcan los datos ficticios. */
export const MARCA_DEMO = 'DEMO';

/** Formato del contenido de QR. */
export const QR = {
  trampa: 'KALO-TRAMPA:',
  gafete: 'KALO-GAFETE:',
} as const;

export const VERSION_API = 'v1';
