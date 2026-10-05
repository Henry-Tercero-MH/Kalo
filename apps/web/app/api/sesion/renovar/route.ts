import { NextResponse, type NextRequest } from 'next/server';
import { borrarTokens, renovar } from '@/lib/servidor';

/** Renueva la sesión y vuelve a la página pedida (usado por el layout del panel). */
export async function GET(req: NextRequest) {
  const volver = req.nextUrl.searchParams.get('volver') ?? '/';
  const destino = volver.startsWith('/') && !volver.startsWith('//') ? volver : '/';
  if (await renovar()) return NextResponse.redirect(new URL(destino, req.url));
  await borrarTokens();
  return NextResponse.redirect(new URL('/login', req.url));
}
