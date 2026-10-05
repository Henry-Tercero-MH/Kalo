/**
 * Cliente HTTP de la API con la sesión del DISPOSITIVO (sirve aunque el usuario haya
 * iniciado sesión sin señal). Renueva el token automáticamente.
 */
import { almacen } from '@/utils/almacen-seguro';

export class ErrorApi extends Error {
  constructor(
    public estado: number,
    message: string,
  ) {
    super(message);
  }
}

const TIEMPO_MAXIMO_MS = 30_000;

async function peticion(url: string, init: RequestInit, tiempo = TIEMPO_MAXIMO_MS): Promise<Response> {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), tiempo);
  try {
    return await fetch(url, { ...init, signal: control.signal });
  } catch (e) {
    throw new ErrorApi(0, control.signal.aborted ? 'Tiempo de espera agotado' : `Sin conexión con el servidor (${String(e)})`);
  } finally {
    clearTimeout(t);
  }
}

async function leerError(r: Response): Promise<string> {
  try {
    const cuerpo = (await r.json()) as { error?: string };
    return cuerpo.error ?? `Error ${r.status}`;
  } catch {
    return `Error ${r.status}`;
  }
}

let renovando: Promise<string> | null = null;

async function renovarToken(apiUrl: string): Promise<string> {
  const tokens = await almacen.tokens();
  if (!tokens) throw new ErrorApi(401, 'Dispositivo sin sesión');
  const r = await peticion(`${apiUrl}/v1/dispositivos/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });
  if (!r.ok) throw new ErrorApi(r.status, await leerError(r));
  const nuevos = (await r.json()) as { accessToken: string; refreshToken: string; expiraEn: number };
  await almacen.guardarTokens(nuevos);
  return nuevos.accessToken;
}

async function tokenVigente(apiUrl: string): Promise<string> {
  const tokens = await almacen.tokens();
  if (!tokens) throw new ErrorApi(401, 'Dispositivo sin sesión');
  if (tokens.expiraEn - Date.now() > 60_000) return tokens.accessToken;
  renovando ??= renovarToken(apiUrl).finally(() => (renovando = null));
  return renovando;
}

/** Llamada autenticada como dispositivo. */
export async function apiDispositivo<T>(ruta: string, init: { method?: string; body?: unknown; tiempo?: number } = {}): Promise<T> {
  const config = await almacen.configuracion();
  if (!config) throw new ErrorApi(401, 'Dispositivo no configurado');
  const hacer = async (token: string) =>
    peticion(
      `${config.apiUrl}${ruta}`,
      {
        method: init.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      },
      init.tiempo,
    );
  let r = await hacer(await tokenVigente(config.apiUrl));
  if (r.status === 401) {
    renovando ??= renovarToken(config.apiUrl).finally(() => (renovando = null));
    r = await hacer(await renovando);
  }
  if (!r.ok) throw new ErrorApi(r.status, await leerError(r));
  return (await r.json()) as T;
}

/** Llamada sin sesión de dispositivo (configuración inicial). */
export async function apiPublica<T>(apiUrl: string, ruta: string, body: unknown, token?: string): Promise<T> {
  const r = await peticion(`${apiUrl}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new ErrorApi(r.status, await leerError(r));
  return (await r.json()) as T;
}
