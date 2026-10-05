/**
 * Esquemas Zod de las solicitudes de la API (compartidos con web y móvil).
 */
import { z } from 'zod';
import { ESTADOS_DISPOSITIVO, ESTADOS_FUSARIUM, UNIDADES_LABOR } from '../constantes';
import { esquemaDefinicionFormulario } from '../formularios';

const pin = z.string().regex(/^\d{4}$/, 'El PIN tiene 4 dígitos');

export const esquemaLogin = z.object({
  usuario: z.string().trim().min(1).max(60),
  pin,
});
export type SolicitudLogin = z.infer<typeof esquemaLogin>;

export const esquemaLoginGafete = z.object({ codigo: z.string().trim().min(8).max(200) });

export const esquemaRefresh = z.object({ refreshToken: z.string().min(20) });

export const esquemaRegistroDispositivo = z.object({
  id: z.string().uuid(),
  nombre: z.string().trim().min(1).max(80),
  modelo: z.string().max(120).optional(),
  sistema: z.string().max(60).optional(),
  versionApp: z.string().max(40).optional(),
  /** Clave (hex) con la que el celular cifra sus respaldos; queda en el servidor. */
  claveRespaldo: z.string().regex(/^[0-9a-f]{64}$/),
});

export const esquemaAccionDispositivo = z.object({
  estado: z.enum(ESTADOS_DISPOSITIVO),
});

export const esquemaValidarRegistro = z.object({
  decision: z.enum(['validado', 'rechazado']),
  motivo: z.string().trim().max(500).optional(),
});

export const esquemaResolverConflicto = z.object({
  /** Valores finales elegidos por el supervisor (campos del registro). */
  valores: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .default({}),
  nota: z.string().trim().max(500).optional(),
});

export const esquemaEstadoFusarium = z.object({
  estado: z.enum(ESTADOS_FUSARIUM),
  notas: z.string().trim().max(1000).optional(),
});

export const esquemaFiltrosRegistros = z.object({
  desde: z.string().date().optional(),
  hasta: z.string().date().optional(),
  lote_id: z.string().optional(),
  usuario_id: z.string().optional(),
  estado_validacion: z.enum(['pendiente', 'validado', 'rechazado']).optional(),
  limite: z.coerce.number().int().min(1).max(5000).default(500),
});
export type FiltrosRegistros = z.infer<typeof esquemaFiltrosRegistros>;

export const esquemaUsuarioNuevo = z.object({
  usuario: z
    .string()
    .trim()
    .regex(/^[a-z0-9._-]{3,40}$/, 'Use minúsculas, números, punto o guion'),
  nombre: z.string().trim().min(3).max(120),
  rol_id: z.string().uuid(),
  finca_id: z.string().uuid(),
  pin,
  trabajador_id: z.string().uuid().nullable().optional(),
});

export const esquemaUsuarioEdicion = esquemaUsuarioNuevo
  .omit({ pin: true, usuario: true })
  .partial()
  .extend({ pin: pin.optional(), activo: z.boolean().optional() });

export const esquemaRolPermisos = z.object({ permisos: z.array(z.string()).max(500) });

export const esquemaLote = z.object({
  codigo: z.string().trim().min(1).max(20),
  nombre: z.string().trim().min(1).max(80),
  hectareas: z.number().positive(),
  poblacion: z.number().int().positive(),
  poligono: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()])).min(4)).min(1),
  }),
});

export const esquemaPlaga = z.object({
  codigo: z.string().trim().min(1).max(40),
  nombre: z.string().trim().min(1).max(80),
  nombre_cientifico: z.string().trim().max(120).nullable().optional(),
  tipo: z.enum(['plaga', 'enfermedad']),
  umbral_alerta: z.number().min(0),
  activo: z.boolean().default(true),
});

export const esquemaTipoLabor = z.object({
  codigo: z.string().trim().min(1).max(40),
  nombre: z.string().trim().min(1).max(80),
  unidad: z.enum(UNIDADES_LABOR),
  tarifa: z.number().min(0).nullable().optional(),
  activo: z.boolean().default(true),
});

export const esquemaSemanaEdicion = z.object({
  color_cinta_id: z.string().uuid().optional(),
  factor: z.number().min(0).max(5).optional(),
});

export const esquemaParametroEdicion = z.object({ valor: z.unknown() });

export const esquemaFeatureFlag = z.object({
  codigo: z.string().min(1),
  rol_id: z.string().uuid().nullable().optional(),
  activo: z.boolean(),
});

export const esquemaOrdenTrabajo = z.object({
  titulo: z.string().trim().min(3).max(120),
  descripcion: z.string().trim().max(1000).nullable().optional(),
  modulo: z.string().min(1),
  lote_id: z.string().uuid().nullable().optional(),
  asignado_a: z.string().uuid(),
  fecha: z.string().date(),
});

export const esquemaGuardarFormulario = esquemaDefinicionFormulario;

export const esquemaEcuacion = z.object({
  poblacion: z.number().min(0),
  retorno: z.number().min(0),
  recobro: z.number().min(0).max(1),
  factor: z.number().min(0),
});
