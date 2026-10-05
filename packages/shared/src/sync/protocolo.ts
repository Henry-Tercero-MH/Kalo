/**
 * Protocolo de sincronización (compatible con `synchronize()` de WatermelonDB).
 *
 *  GET  /v1/sync/pull?last_pulled_at=<ms|null>  → cambios desde la última descarga
 *  POST /v1/sync/push                            → cambios locales en lote, respuesta por registro
 *
 * Ver docs/sincronizacion.md.
 */
import { z } from 'zod';

/** Fila cruda tal como viaja (JSON como string, fechas como milisegundos). */
export type FilaCruda = Record<string, string | number | boolean | null> & { id: string };

export interface CambiosTabla {
  created: FilaCruda[];
  updated: FilaCruda[];
  deleted: string[];
}

export type Cambios = Record<string, CambiosTabla>;

export type AccionDispositivo = 'ninguna' | 'bloquear' | 'borrar';

export interface RespuestaPull {
  changes: Cambios;
  timestamp: number;
  dispositivo: { accion: AccionDispositivo };
}

export const esquemaCambiosTabla = z.object({
  created: z.array(z.record(z.string(), z.unknown())).default([]),
  updated: z.array(z.record(z.string(), z.unknown())).default([]),
  deleted: z.array(z.string()).default([]),
});

export const esquemaSolicitudPush = z.object({
  changes: z.record(z.string(), esquemaCambiosTabla),
  lastPulledAt: z.number().nullable(),
  /** Estado del celular reportado al panel de dispositivos. */
  estado: z
    .object({
      versionApp: z.string().max(40).optional(),
      registrosPendientes: z.number().int().min(0).optional(),
      archivosPendientes: z.number().int().min(0).optional(),
    })
    .optional(),
});

export type SolicitudPush = z.infer<typeof esquemaSolicitudPush>;

export type EstadoResultadoPush = 'aceptado' | 'fusionado' | 'rechazado';

export interface ResultadoRegistroPush {
  tabla: string;
  id: string;
  estado: EstadoResultadoPush;
  /** Hubo cambios concurrentes en campos distintos o iguales (se registró en bitácora). */
  conflicto?: boolean;
  error?: string;
}

export interface RespuestaPush {
  resultados: ResultadoRegistroPush[];
  /** Formato que entiende WatermelonDB para marcar registros rechazados. */
  experimentalRejectedIds: Record<string, string[]>;
  serverTime: number;
}
