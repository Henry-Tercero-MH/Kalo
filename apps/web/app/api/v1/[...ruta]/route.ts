/**
 * Proxy del panel hacia la API: agrega el token de la cookie y renueva la sesión si venció.
 * El navegador nunca ve los tokens.
 *
 * En modo demo (KALO_DATOS distinto de `api`) no se contacta la API: responde el enrutador
 * en memoria de `src/mock` con los datos DEMO grabados.
 */
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { API_INTERNA, COOKIE_ACCESO, renovar } from '@/lib/servidor';
import { reenviarMock } from '@/mock/http';
import { modoMock } from '@/mock/modo';

async function reenviar(req: NextRequest, ruta: string[]) {
  if (modoMock()) return reenviarMock(req, ruta);
  const url = `${API_INTERNA}/v1/${ruta.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const cuerpo =
    req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer();
  const hacer = (token?: string) =>
    fetch(url, {
      method: req.method,
      headers: {
        ...(req.headers.get('content-type')
          ? { 'Content-Type': req.headers.get('content-type')! }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo,
      cache: 'no-store',
    });
  let r = await hacer((await cookies()).get(COOKIE_ACCESO)?.value);
  if (r.status === 401) {
    const nuevo = await renovar();
    if (nuevo) r = await hacer(nuevo);
  }
  const cabeceras = new Headers();
  for (const h of ['content-type', 'content-disposition']) {
    const v = r.headers.get(h);
    if (v) cabeceras.set(h, v);
  }
  return new NextResponse(r.body, { status: r.status, headers: cabeceras });
}

type Ctx = { params: Promise<{ ruta: string[] }> };
const manejar = async (req: NextRequest, ctx: Ctx) => reenviar(req, (await ctx.params).ruta);
export { manejar as GET, manejar as POST, manejar as PATCH, manejar as PUT, manejar as DELETE };
