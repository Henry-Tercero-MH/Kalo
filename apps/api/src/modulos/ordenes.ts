import { esquemaOrdenTrabajo } from '@kalo/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { registrarBitacora } from '../bitacora/servicio';
import { ordenes_trabajo } from '../db/esquema';
import { escrituraSincronizada } from '../sync/repositorio-drizzle';

export default async function rutasOrdenes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/',
    {
      preHandler: app.requiere('ordenes:ver'),
      schema: { tags: ['ordenes'], summary: 'Órdenes de trabajo' },
    },
    async (req) =>
      app.db
        .select()
        .from(ordenes_trabajo)
        .where(
          and(
            eq(ordenes_trabajo.finca_id, req.usuario!.fincaId),
            isNull(ordenes_trabajo.deleted_at),
          ),
        )
        .orderBy(desc(ordenes_trabajo.fecha))
        .limit(500),
  );

  app.post(
    '/',
    {
      preHandler: app.requiere('ordenes:crear'),
      schema: {
        tags: ['ordenes'],
        summary: 'Asigna una orden de trabajo',
        body: esquemaOrdenTrabajo,
      },
    },
    async (req) => {
      const u = req.usuario!;
      return escrituraSincronizada(app.db, u.fincaId, async (tx, ahora) => {
        const [fila] = await tx
          .insert(ordenes_trabajo)
          .values({
            ...req.body,
            estado: 'pendiente',
            asignado_por: u.id,
            finca_id: u.fincaId,
            created_by: u.id,
            created_at: ahora,
            updated_at: ahora,
            server_updated_at: ahora,
          })
          .returning({ id: ordenes_trabajo.id });
        await registrarBitacora(tx, {
          fincaId: u.fincaId,
          usuarioId: u.id,
          accion: 'crear',
          tabla: 'ordenes_trabajo',
          registroId: fila!.id,
        });
        return fila;
      });
    },
  );
}
