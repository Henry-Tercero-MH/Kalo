/**
 * Inicio y cierre de sesión del panel. Los tokens quedan en cookies httpOnly.
 */
import { NextResponse, type NextRequest } from 'next/server';
import {
  API_INTERNA,
  borrarTokens,
  guardarSesionMock,
  guardarTokens,
  type RespuestaTokens,
} from '@/lib/servidor';
import { modoMock } from '@/mock/modo';
import { iniciarSesionMock } from '@/mock/sesion';

export async function POST(req: NextRequest) {
  const cuerpo = await req.json().catch(() => null);
  if (modoMock()) {
    // Modo demo: usuario + PIN contra los usuarios DEMO en memoria (sin API).
    const r = iniciarSesionMock(cuerpo);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    await guardarSesionMock(r.perfil.id);
    return NextResponse.json({ usuario: r.perfil });
  }
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
