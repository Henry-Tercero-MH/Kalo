import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { refresh_tokens } from '../db/esquema';
import { noAutorizado } from '../lib/errores';

const DIA = 86_400_000;
const hash = (t: string) => createHash('sha256').update(t).digest('hex');

export interface ParTokens {
  accessToken: string;
  refreshToken: string;
  expiraEn: number;
}

/** Emite access JWT + refresh token opaco (guardado como hash, rotativo). */
export async function emitirTokens(
  app: FastifyInstance,
  tipo: 'usuario' | 'dispositivo',
  sujetoId: string,
): Promise<ParTokens> {
  const accessToken = app.jwt.sign(
    { sub: sujetoId, typ: tipo },
    { expiresIn: app.config.JWT_ACCESS_TTL },
  );
  const refreshToken = randomBytes(48).toString('base64url');
  const dias =
    tipo === 'dispositivo' ? app.config.JWT_DISPOSITIVO_TTL_DIAS : app.config.JWT_REFRESH_TTL_DIAS;
  const ahora = Date.now();
  await app.db.insert(refresh_tokens).values({
    sujeto_tipo: tipo,
    sujeto_id: sujetoId,
    hash: hash(refreshToken),
    expira_en: ahora + dias * DIA,
    created_at: ahora,
  });
  const decodificado = app.jwt.decode<{ exp: number }>(accessToken);
  return { accessToken, refreshToken, expiraEn: (decodificado?.exp ?? 0) * 1000 };
}

/** Valida y revoca un refresh token (rotación). Devuelve el sujeto. */
export async function consumirRefresh(
  app: FastifyInstance,
  token: string,
  tipo: 'usuario' | 'dispositivo',
): Promise<string> {
  const ahora = Date.now();
  const [fila] = await app.db
    .update(refresh_tokens)
    .set({ revocado_en: ahora })
    .where(
      and(
        eq(refresh_tokens.hash, hash(token)),
        eq(refresh_tokens.sujeto_tipo, tipo),
        isNull(refresh_tokens.revocado_en),
        gt(refresh_tokens.expira_en, ahora),
      ),
    )
    .returning({ sujeto: refresh_tokens.sujeto_id });
  if (!fila) throw noAutorizado('Sesión vencida: inicie sesión de nuevo');
  return fila.sujeto;
}

export async function revocarTodos(
  app: FastifyInstance,
  tipo: 'usuario' | 'dispositivo',
  sujetoId: string,
) {
  await app.db
    .update(refresh_tokens)
    .set({ revocado_en: Date.now() })
    .where(
      and(
        eq(refresh_tokens.sujeto_tipo, tipo),
        eq(refresh_tokens.sujeto_id, sujetoId),
        isNull(refresh_tokens.revocado_en),
      ),
    );
}
