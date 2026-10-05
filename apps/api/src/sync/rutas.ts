import { esquemaSolicitudPush } from '@kalo/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { revocarTodos } from '../auth/tokens';
import { leerParametro } from '../cobertura/parametros';
import { recalcularPorPuntos } from '../cobertura/servicio';
import { dispositivos, parametros } from '../db/esquema';
import { procesarPull, procesarPush } from './motor';
import { crearRepositorioSync } from './repositorio-drizzle';

export default async function rutasSync(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const repo = crearRepositorioSync(app.db);

  app.get(
    '/pull',
    {
      preHandler: app.autenticarDispositivo,
      schema: {
        tags: ['sync'],
        summary: 'Cambios desde la última descarga (protocolo WatermelonDB)',
        querystring: z.object({
          last_pulled_at: z
            .string()
            .optional()
            .transform((v) => (v && v !== 'null' && v !== '0' ? Number(v) : null)),
        }),
      },
    },
    async (req) => {
      const filas = await app.db
        .select({ clave: parametros.clave, valor: parametros.valor })
        .from(parametros);
      const dias = Number(leerParametro(filas, 'sync_dias_historial'));
      return procesarPull(repo, req.dispositivo!, req.query.last_pulled_at, dias);
    },
  );

  app.post(
    '/push',
    {
      preHandler: app.autenticarDispositivo,
      bodyLimit: 20 * 1024 * 1024,
      schema: {
        tags: ['sync'],
        summary: 'Recibe los cambios locales en lote y responde por registro',
        body: esquemaSolicitudPush,
      },
    },
    async (req) => {
      const { afectados, ...respuesta } = await procesarPush(repo, req.dispositivo!, req.body);
      if (afectados.puntos_ruta?.length) {
        // La cobertura se recalcula después de responder para no demorar al celular.
        const ids = afectados.puntos_ruta;
        setImmediate(() => {
          recalcularPorPuntos(app.db, ids).catch((e) =>
            app.log.error(e, 'Error al recalcular cobertura'),
          );
        });
      }
      return respuesta;
    },
  );

  app.post(
    '/borrado-confirmado',
    {
      preHandler: app.autenticarDispositivo,
      schema: { tags: ['sync'], summary: 'El celular confirma que borró sus datos locales' },
    },
    async (req) => {
      await app.db
        .update(dispositivos)
        .set({ estado: 'borrado', updated_at: Date.now() })
        .where(eq(dispositivos.id, req.dispositivo!.id));
      await revocarTodos(app, 'dispositivo', req.dispositivo!.id);
      return { ok: true };
    },
  );
}
