import { NextResponse, type NextRequest } from 'next/server';
import { borrarTokens, perfilActual, renovar } from '@/lib/servidor';
import { modoMock } from '@/mock/modo';

/** Renueva la sesión y vuelve a la página pedida (usado por el layout del panel). */
export async function GET(req: NextRequest) {
  const volver = req.nextUrl.searchParams.get('volver') ?? '/';
  const destino = volver.startsWith('/') && !volver.startsWith('//') ? volver : '/';
  // Modo demo: no hay refresh token; solo se redirige (con sesión válida) o se va al login.
  const valida = modoMock() ? Boolean((await perfilActual()).perfil) : Boolean(await renovar());
  if (valida) return NextResponse.redirect(new URL(destino, req.url));
  await borrarTokens();
  return NextResponse.redirect(new URL('/login', req.url));
}
