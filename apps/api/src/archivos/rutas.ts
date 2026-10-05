/**
 * Cola de archivos: los datos viajan primero por /sync; luego el celular pide una URL
 * prefirmada, sube el archivo directo a MinIO y confirma.
 */
import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { archivos } from '../db/esquema';
import { ErrorHttp, noEncontrado } from '../lib/errores';
import { escrituraSincronizada } from '../sync/repositorio-drizzle';
import { existeObjeto, urlDescarga, urlSubida } from './s3';

const EXTENSIONES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'application/pdf': 'pdf',
};

export default async function rutasArchivos(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const params = z.object({ id: z.string().uuid() });

  async function buscar(id: string, fincaId: string) {
    const [a] = await app.db
      .select()
      .from(archivos)
      .where(and(eq(archivos.id, id), eq(archivos.finca_id, fincaId), isNull(archivos.deleted_at)));
    if (!a) throw noEncontrado('El archivo aún no está sincronizado');
    return a;
  }

  app.post(
    '/:id/subida',
    {
      preHandler: app.autenticarDispositivo,
      schema: { tags: ['archivos'], summary: 'URL prefirmada para subir un archivo', params },
    },
    async (req) => {
      const a = await buscar(req.params.id, req.dispositivo!.fincaId);
      const ext = EXTENSIONES[a.mime] ?? 'bin';
      const clave = `${a.finca_id}/${a.registro_tabla}/${a.registro_id}/${a.id}.${ext}`;
      return { url: await urlSubida(app.s3, clave, a.mime), clave, metodo: 'PUT', mime: a.mime };
    },
  );

  app.post(
    '/:id/confirmar',
    {
      preHandler: app.autenticarDispositivo,
      schema: {
        tags: ['archivos'],
        summary: 'Confirma que el archivo se subió',
        params,
        body: z.object({ clave: z.string().min(1).max(300) }),
      },
    },
    async (req) => {
      const a = await buscar(req.params.id, req.dispositivo!.fincaId);
      if (!req.body.clave.startsWith(`${a.finca_id}/`)) throw new ErrorHttp(400, 'Clave inválida');
      const tamano = await existeObjeto(app.s3, req.body.clave);
      if (tamano === null) throw new ErrorHttp(409, 'El archivo no llegó al almacenamiento');
      await escrituraSincronizada(app.db, a.finca_id!, (tx, ahora) =>
        tx
          .update(archivos)
          .set({ estado_subida: 'subido', clave_s3: req.body.clave, updated_at: ahora, server_updated_at: ahora })
          .where(eq(archivos.id, a.id)),
      );
      return { ok: true, tamano };
    },
  );

  app.get(
    '/',
    {
      preHandler: app.requiere('registros:ver'),
      schema: {
        tags: ['archivos'],
        summary: 'Archivos de un registro con URL de descarga',
        querystring: z.object({ registro_tabla: z.string(), registro_id: z.string().uuid() }),
      },
    },
    async (req) => {
      const filas = await app.db
        .select()
        .from(archivos)
        .where(
          and(
            eq(archivos.registro_tabla, req.query.registro_tabla),
            eq(archivos.registro_id, req.query.registro_id),
            eq(archivos.finca_id, req.usuario!.fincaId),
            isNull(archivos.deleted_at),
          ),
        );
      return Promise.all(
        filas.map(async (a) => ({
          id: a.id,
          tipo: a.tipo,
          mime: a.mime,
          estado_subida: a.estado_subida,
          created_at: a.created_at,
          url: a.clave_s3 && a.estado_subida === 'subido' ? await urlDescarga(app.s3, a.clave_s3) : null,
        })),
      );
    },
  );
}
