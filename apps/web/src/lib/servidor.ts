/**
 * Utilidades del lado del servidor: tokens en cookies httpOnly (nunca accesibles desde JS).
 */
import 'server-only';
import { cookies } from 'next/headers';

export const API_INTERNA = process.env.API_URL_INTERNA ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const COOKIE_ACCESO = 'kalo_at';
export const COOKIE_RENOVACION = 'kalo_rt';

const base = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export interface RespuestaTokens {
  accessToken: string;
  refreshToken: string;
  expiraEn: number;
  usuario: PerfilUsuario;
}

export interface PerfilUsuario {
  id: string;
  nombre: string;
  usuario: string;
  rol: string;
  fincaId: string;
  permisos: string[];
  plataformas: string[];
  modulosWeb: string[];
}

export async function guardarTokens(t: { accessToken: string; refreshToken: string }) {
  const c = await cookies();
  c.set(COOKIE_ACCESO, t.accessToken, { ...base, maxAge: 60 * 60 });
  c.set(COOKIE_RENOVACION, t.refreshToken, { ...base, maxAge: 60 * 60 * 24 * 30 });
}

export async function borrarTokens() {
  const c = await cookies();
  c.delete(COOKIE_ACCESO);
  c.delete(COOKIE_RENOVACION);
}

/** Renueva la sesión con el refresh token (rotativo). Devuelve el nuevo access token o null. */
export async function renovar(): Promise<string | null> {
  const c = await cookies();
  const rt = c.get(COOKIE_RENOVACION)?.value;
  if (!rt) return null;
  const r = await fetch(`${API_INTERNA}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
    cache: 'no-store',
  });
  if (!r.ok) return null;
  const t = (await r.json()) as RespuestaTokens;
  await guardarTokens(t);
  return t.accessToken;
}

/** Perfil del usuario actual (desde un componente de servidor). */
export async function perfilActual(): Promise<{ perfil: PerfilUsuario | null; vencido: boolean }> {
  const c = await cookies();
  const at = c.get(COOKIE_ACCESO)?.value;
  const rt = c.get(COOKIE_RENOVACION)?.value;
  if (!at && !rt) return { perfil: null, vencido: false };
  if (at) {
    const r = await fetch(`${API_INTERNA}/v1/auth/yo`, { headers: { Authorization: `Bearer ${at}` }, cache: 'no-store' });
    if (r.ok) return { perfil: (await r.json()) as PerfilUsuario, vencido: false };
  }
  return { perfil: null, vencido: Boolean(rt) };
}
