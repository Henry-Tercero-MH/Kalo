/**
 * Inicio y cierre de sesión del panel. Los tokens quedan en cookies httpOnly.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { API_INTERNA, borrarTokens, guardarTokens, type RespuestaTokens } from '@/lib/servidor';

export async function POST(req: NextRequest) {
  const cuerpo = await req.json().catch(() => null);
  const r = await fetch(`${API_INTERNA}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
    cache: 'no-store',
  }).catch(() => null);
  if (!r) return NextResponse.json({ error: 'No se pudo conectar con la API' }, { status: 502 });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json(datos, { status: r.status });
  const t = datos as RespuestaTokens;
  if (!t.usuario.plataformas.includes('web')) {
    return NextResponse.json(
      { error: 'Su rol usa la app móvil, no el panel web.' },
      { status: 403 },
    );
  }
  await guardarTokens(t);
  return NextResponse.json({ usuario: t.usuario });
}

export async function DELETE() {
  await borrarTokens();
  return NextResponse.json({ ok: true });
}
