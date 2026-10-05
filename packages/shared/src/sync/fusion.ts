/**
 * Resolución de conflictos.
 *
 * Regla: gana el cambio más reciente según `updated_at`, campo por campo.
 *  - WatermelonDB envía en `_changed` la lista de columnas que el celular modificó.
 *  - La versión base es el `server_updated_at` que el celular tenía cuando editó: la app
 *    lo conserva al resolver conflictos en el pull (ver `resolverConflictoLocal`). Si no viene,
 *    se usa la última descarga del celular.
 *  - Si el servidor no cambió el registro desde esa versión base, se aplican
 *    los campos del celular sin conflicto.
 *  - Si sí cambió (otro celular o el panel), solo se comparan los campos que el celular tocó:
 *    para cada uno gana el lado con `updated_at` mayor. Los demás campos quedan como en el
 *    servidor. Si un campo tocado tenía un valor distinto en el servidor, hay conflicto.
 * En tablas críticas el conflicto se guarda en `bitacora` y aparece en la bandeja del
 * supervisor (lo decide la API).
 */
import { COLUMNAS_SOLO_SERVIDOR } from '../tablas/columnas';
import type { FilaCruda } from './protocolo';

/** Columnas internas que nunca se comparan ni copian. */
const IGNORADAS = new Set<string>([
  'id',
  '_status',
  '_changed',
  'created_at',
  'device_id',
  'created_by',
  'finca_id',
  ...COLUMNAS_SOLO_SERVIDOR,
  'estado_validacion',
]);

export interface CampoEnConflicto {
  campo: string;
  valorServidor: unknown;
  valorCliente: unknown;
  ganador: 'servidor' | 'cliente';
}

export interface ResultadoFusion {
  /** Fila resultante (sin `server_updated_at`, que pone el servidor). */
  fila: FilaCruda;
  /** Columnas que efectivamente cambiaron respecto al servidor. */
  cambiados: string[];
  conflicto: boolean;
  camposEnConflicto: CampoEnConflicto[];
}

/** Lee la lista `_changed` de WatermelonDB ("a,b,c"). */
export function camposCambiados(cliente: Record<string, unknown>): string[] | null {
  const raw = cliente._changed;
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  return raw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

function iguales(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return a == b;
  if (typeof a === 'string' && typeof b === 'string') {
    // Columnas JSON: compara por contenido.
    try {
      return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
    } catch {
      return false;
    }
  }
  return false;
}

export function fusionarRegistro(
  servidor: FilaCruda,
  cliente: FilaCruda,
  ultimaDescarga: number | null,
): ResultadoFusion {
  const cambiosDeclarados = camposCambiados(cliente);
  const candidatos = (
    cambiosDeclarados ?? Object.keys(cliente).filter((k) => !iguales(cliente[k], servidor[k]))
  ).filter((c) => !IGNORADAS.has(c) && c in cliente);

  const servidorUpdated = Number(servidor.server_updated_at ?? 0);
  const base =
    typeof cliente.server_updated_at === 'number' && cliente.server_updated_at > 0
      ? cliente.server_updated_at
      : ultimaDescarga;
  const concurrente = base === null || servidorUpdated > base;
  const clienteMasReciente = Number(cliente.updated_at ?? 0) > Number(servidor.updated_at ?? 0);

  const fila: FilaCruda = { ...servidor };
  const cambiados: string[] = [];
  const camposEnConflicto: CampoEnConflicto[] = [];

  for (const campo of candidatos) {
    if (campo === 'updated_at') continue;
    const vc = cliente[campo] ?? null;
    const vs = servidor[campo] ?? null;
    if (iguales(vc, vs)) continue;
    if (!concurrente || clienteMasReciente) {
      fila[campo] = vc;
      cambiados.push(campo);
      if (concurrente) {
        camposEnConflicto.push({ campo, valorServidor: vs, valorCliente: vc, ganador: 'cliente' });
      }
    } else {
      camposEnConflicto.push({ campo, valorServidor: vs, valorCliente: vc, ganador: 'servidor' });
    }
  }

  if (cambiados.length > 0) {
    fila.updated_at = Math.max(Number(servidor.updated_at ?? 0), Number(cliente.updated_at ?? 0));
  }

  return { fila, cambiados, conflicto: camposEnConflicto.length > 0, camposEnConflicto };
}

/**
 * Resolución en el celular durante el pull (equivalente al `conflictResolver` de WatermelonDB).
 * Toma la versión remota, conserva los campos que el usuario cambió localmente y conserva la
 * versión base (`server_updated_at` local) para que el servidor detecte el conflicto y aplique
 * "gana el más reciente" con registro en bitácora.
 */
export function resolverConflictoLocal<T extends Record<string, unknown>>(
  local: T,
  remoto: T,
): T {
  const resuelto: Record<string, unknown> = { ...local, ...remoto };
  const cambiados = camposCambiados(local) ?? [];
  for (const c of cambiados) resuelto[c] = local[c];
  resuelto.id = local.id;
  resuelto._status = local._status;
  resuelto._changed = local._changed;
  resuelto.server_updated_at = local.server_updated_at;
  return resuelto as T;
}
