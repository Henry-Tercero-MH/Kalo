/**
 * Importación de respaldos cifrados: si un celular nunca logra sincronizar, se exporta su base
 * local cifrada (AES-256-GCM con la clave que el celular registró) y aquí se procesa como un push.
 */
import { createDecipheriv } from 'node:crypto';
import { esquemaSolicitudPush } from '@kalo/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { dispositivos, fincas } from '../db/esquema';
import { noEncontrado, solicitudInvalida } from '../lib/errores';
import { procesarPush } from '../sync/motor';
import { crearRepositorioSync } from '../sync/repositorio-drizzle';

export const esquemaArchivoRespaldo = z.object({
  formato: z.literal('kalo-respaldo'),
  version: z.literal(1),
  dispositivoId: z.string().uuid(),
  creadoEn: z.number(),
  iv: z.string().regex(/^[0-9a-f]{24}$/),
  /** base64 de ciphertext || tag (16 bytes) */
  datos: z.string().min(1),
});

export function descifrarRespaldo(claveHex: string, ivHex: string, datosB64: string): string {
  const todo = Buffer.from(datosB64, 'base64');
  const tag = todo.subarray(todo.length - 16);
  const cifrado = todo.subarray(0, todo.length - 16);
  const d = createDecipheriv('aes-256-gcm', Buffer.from(claveHex, 'hex'), Buffer.from(ivHex, 'hex'));
  d.setAuthTag(tag);
  return Buffer.concat([d.update(cifrado), d.final()]).toString('utf8');
}

export default async function rutasRespaldos(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.post(
    '/importar',
    {
      preHandler: app.requiere('dispositivos:gestionar'),
      bodyLimit: 50 * 1024 * 1024,
      schema: { tags: ['dispositivos'], summary: 'Importa un respaldo cifrado de un celular', body: esquemaArchivoRespaldo },
    },
    async (req) => {
      const [d] = await app.db
        .select({ id: dispositivos.id, fincaId: dispositivos.finca_id, clave: dispositivos.clave_respaldo, empresaId: fincas.empresa_id })
        .from(dispositivos)
        .innerJoin(fincas, eq(fincas.id, dispositivos.finca_id))
        .where(eq(dispositivos.id, req.body.dispositivoId));
      if (!d || d.fincaId !== req.usuario!.fincaId) throw noEncontrado('Dispositivo no encontrado');
      let contenido: unknown;
      try {
        contenido = JSON.parse(descifrarRespaldo(d.clave, req.body.iv, req.body.datos));
      } catch {
        throw solicitudInvalida('No se pudo descifrar el respaldo (archivo dañado o de otro dispositivo)');
      }
      const solicitud = esquemaSolicitudPush.parse(contenido);
      // Se procesa como push de un celular activo (con conflicto si el servidor tiene cambios).
      const { afectados: _a, ...r } = await procesarPush(
        crearRepositorioSync(app.db),
        { id: d.id, fincaId: d.fincaId, empresaId: d.empresaId, estado: 'activo' },
        { ...solicitud, lastPulledAt: solicitud.lastPulledAt ?? null },
      );
      return r;
    },
  );
}
