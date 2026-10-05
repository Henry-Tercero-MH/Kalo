/** Consentimiento del rastreo GPS (se guarda en la base y se sincroniza). */
import { Q } from '@nozbe/watermelondb';
import { consultar, crear, type ContextoEscritura } from '@/db/repositorio';

export const VERSION_TEXTO_CONSENTIMIENTO = '2026-10-v1';

export async function tieneConsentimiento(usuarioId: string): Promise<boolean> {
  const r = await consultar(
    'consentimientos',
    Q.where('usuario_id', usuarioId),
    Q.where('tipo', 'rastreo_gps'),
    Q.where('aceptado', true),
  );
  return r.length > 0;
}

export async function guardarConsentimiento(ctx: ContextoEscritura, aceptado: boolean) {
  await crear(
    'consentimientos',
    {
      usuario_id: ctx.usuarioId,
      tipo: 'rastreo_gps',
      version_texto: VERSION_TEXTO_CONSENTIMIENTO,
      aceptado,
    },
    ctx,
  );
}
