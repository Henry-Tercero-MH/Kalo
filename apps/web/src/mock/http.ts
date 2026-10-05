/**
 * Adaptador entre las rutas de Next (proxy /api/v1) y el enrutador del modo demo.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { almacen } from './almacen';
import { responderMock } from './enrutador';
import { usuarioDeTokenMock } from './modo';
import { perfilMock } from './sesion';

/** Nombre de la cookie de acceso (igual que en modo API). */
export const COOKIE_ACCESO_MOCK = 'kalo_at';

/** Perfil del usuario de la cookie de sesión demo (o null). */
export async function perfilDeCookieMock() {
  const token = (await cookies()).get(COOKIE_ACCESO_MOCK)?.value;
  return perfilMock(almacen(), usuarioDeTokenMock(token));
}

export async function reenviarMock(req: NextRequest, ruta: string[]) {
  let cuerpo: unknown;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const texto = await req.text();
    if (texto) {
      try {
        cuerpo = JSON.parse(texto);
      } catch {
        return NextResponse.json(
          { error: 'Cuerpo JSON inválido', codigo: 'SOLICITUD_INVALIDA' },
          { status: 400 },
        );
      }
    }
  }
  const r = await responderMock(
    req.method,
    ruta.map(encodeURIComponent).join('/'),
    req.nextUrl.searchParams,
    cuerpo,
    await perfilDeCookieMock(),
  );
  const cabeceras = new Headers({ 'x-kalo-datos': 'demo', ...(r.headers ?? {}) });
  if (r.bytes)
    return new NextResponse(r.bytes as unknown as BodyInit, {
      status: r.status,
      headers: cabeceras,
    });
  return NextResponse.json(r.json ?? null, { status: r.status, headers: cabeceras });
}
