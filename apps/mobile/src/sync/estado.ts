/**
 * Estado visible de la sincronización (indicador permanente en la barra).
 */
import { create } from 'zustand';

export type FaseSync = 'inactivo' | 'sincronizando' | 'error';

interface EstadoSync {
  fase: FaseSync;
  conectado: boolean;
  wifi: boolean;
  pendientes: number;
  pendientesPorTabla: Record<string, number>;
  archivosPendientes: number;
  ultimoEnvio: number | null;
  ultimoError: string | null;
  rechazados: number;
  conflictos: number;
  progresoArchivos: { actual: number; total: number } | null;
  fijar: (parcial: Partial<Omit<EstadoSync, 'fijar'>>) => void;
}

export const useEstadoSync = create<EstadoSync>((set) => ({
  fase: 'inactivo',
  conectado: false,
  wifi: false,
  pendientes: 0,
  pendientesPorTabla: {},
  archivosPendientes: 0,
  ultimoEnvio: null,
  ultimoError: null,
  rechazados: 0,
  conflictos: 0,
  progresoArchivos: null,
  fijar: (parcial) => set(parcial),
}));

export type ResumenSync = 'sincronizado' | 'pendiente' | 'sincronizando' | 'error' | 'sinRed';

export function resumir(
  e: Pick<EstadoSync, 'fase' | 'conectado' | 'pendientes' | 'archivosPendientes'>,
): ResumenSync {
  if (e.fase === 'sincronizando') return 'sincronizando';
  if (e.fase === 'error') return 'error';
  if (e.pendientes + e.archivosPendientes > 0) return e.conectado ? 'pendiente' : 'sinRed';
  return 'sincronizado';
}
