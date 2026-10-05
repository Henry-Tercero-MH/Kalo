/**
 * Selección de la fuente de datos del panel.
 *
 * - `KALO_DATOS=api`: el panel habla con la API Fastify (modo real).
 * - Cualquier otro valor o sin definir: datos DEMO en memoria (modo demo, sin API).
 */
import 'server-only';

export function modoMock(): boolean {
  return process.env.KALO_DATOS !== 'api';
}

/** Prefijo del token de sesión en modo demo (cookie httpOnly `kalo_at`). */
export const PREFIJO_TOKEN_MOCK = 'mock:';

export function tokenMock(usuarioId: string): string {
  return `${PREFIJO_TOKEN_MOCK}${usuarioId}`;
}

export function usuarioDeTokenMock(token: string | undefined | null): string | null {
  if (!token || !token.startsWith(PREFIJO_TOKEN_MOCK)) return null;
  return token.slice(PREFIJO_TOKEN_MOCK.length) || null;
}
