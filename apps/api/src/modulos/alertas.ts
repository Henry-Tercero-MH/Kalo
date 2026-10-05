import { esquemaEstadoFusarium } from '@kalo/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { registrarBitacora } from '../bitacora/servicio';
import { alertas_fusarium } from '../db/esquema';
import { noEncontrado } from '../lib/errores';
import { escrituraSincronizada } from '../sync/repositorio-drizzle';

export default async function rutasAlertas(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/',
    {
      preHandler: app.requiere('fusarium:ver'),
      schema: { tags: ['alertas'], summary: 'Bandeja de alertas de Fusarium' },
    },
    async (req) => {
      const filas = await app.db
        .select()
        .from(alertas_fusarium)
        .where(
          and(
            eq(alertas_fusarium.finca_id, req.usuario!.fincaId),
            isNull(alertas_fusarium.deleted_at),
          ),
        )
        .orderBy(desc(alertas_fusarium.created_at))
        .limit(500);
      return filas.map(({ geom: _g, ...a }) => a);
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: app.requiere('fusarium:gestionar'),
      schema: {
        tags: ['alertas'],
        summary: 'Cambia el estado de una alerta',
        params: z.object({ id: z.string().uuid() }),
        body: esquemaEstadoFusarium,
      },
    },
    async (req) => {
      const u = req.usuario!;
      const ok = await escrituraSincronizada(app.db, u.fincaId, async (tx, ahora) => {
        const r = await tx
          .update(alertas_fusarium)
          .set({
            estado: req.body.estado,
            ...(req.body.notas !== undefined ? { notas: req.body.notas } : {}),
            updated_at: ahora,
            server_updated_at: ahora,
          })
          .where(
            and(eq(alertas_fusarium.id, req.params.id), eq(alertas_fusarium.finca_id, u.fincaId)),
          )
          .returning({ id: alertas_fusarium.id });
        if (r.length) {
          await registrarBitacora(tx, {
            fincaId: u.fincaId,
            usuarioId: u.id,
            accion: 'editar',
            tabla: 'alertas_fusarium',
            registroId: req.params.id,
            datos: { estado: req.body.estado },
          });
        }
        return r.length > 0;
      });
      if (!ok) throw noEncontrado('Alerta no encontrada');
      return { ok: true };
    },
  );
}
