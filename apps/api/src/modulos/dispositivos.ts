/**
 * Registro de celulares, sesión de dispositivo y panel de dispositivos (borrado remoto).
 */
import { esquemaAccionDispositivo, esquemaRefresh, esquemaRegistroDispositivo } from '@kalo/shared';
import { desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { consumirRefresh, emitirTokens, revocarTodos } from '../auth/tokens';
import { registrarBitacora } from '../bitacora/servicio';
import { dispositivos, fincas } from '../db/esquema';
import { noAutorizado, noEncontrado, prohibido } from '../lib/errores';

export default async function rutasDispositivos(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/registrar',
    {
      preHandler: app.requiere('sincronizacion:usar'),
      schema: {
        tags: ['dispositivos'],
        summary: 'Configura un celular para la finca del usuario (requiere señal una sola vez)',
        body: esquemaRegistroDispositivo,
      },
    },
    async (req) => {
      const u = req.usuario!;
      const ahora = Date.now();
      const [existente] = await app.db.select().from(dispositivos).where(eq(dispositivos.id, req.body.id));
      if (existente && existente.finca_id !== u.fincaId) throw prohibido('El dispositivo pertenece a otra finca');
      if (existente?.estado === 'borrado' || existente?.estado === 'borrado_solicitado') {
        throw prohibido('El dispositivo fue dado de baja; pida al administrador que lo reactive');
      }
      await app.db
        .insert(dispositivos)
        .values({
          id: req.body.id,
          finca_id: u.fincaId,
          nombre: req.body.nombre,
          modelo: req.body.modelo,
          sistema: req.body.sistema,
          version_app: req.body.versionApp,
          clave_respaldo: req.body.claveRespaldo,
          registrado_por: u.id,
          created_at: ahora,
          updated_at: ahora,
        })
        .onConflictDoUpdate({
          target: dispositivos.id,
          set: {
            nombre: req.body.nombre,
            modelo: req.body.modelo,
            version_app: req.body.versionApp,
            clave_respaldo: req.body.claveRespaldo,
            estado: 'activo',
            updated_at: ahora,
          },
        });
      await registrarBitacora(app.db, {
        fincaId: u.fincaId,
        usuarioId: u.id,
        dispositivoId: req.body.id,
        accion: 'registrar_dispositivo',
      });
      const [finca] = await app.db.select().from(fincas).where(eq(fincas.id, u.fincaId));
      return {
        ...(await emitirTokens(app, 'dispositivo', req.body.id)),
        finca: finca ? { id: finca.id, nombre: finca.nombre, bbox: finca.bbox } : null,
      };
    },
  );

  app.post(
    '/refresh',
    { schema: { tags: ['dispositivos'], summary: 'Renueva la sesión del dispositivo', body: esquemaRefresh } },
    async (req) => {
      const id = await consumirRefresh(app, req.body.refreshToken, 'dispositivo');
      const [d] = await app.db.select().from(dispositivos).where(eq(dispositivos.id, id));
      if (!d || d.estado === 'borrado') throw noAutorizado('Dispositivo dado de baja');
      return emitirTokens(app, 'dispositivo', id);
    },
  );

  app.get(
    '/',
    { preHandler: app.requiere('dispositivos:ver'), schema: { tags: ['dispositivos'], summary: 'Panel de dispositivos' } },
    async (req) =>
      app.db
        .select({
          id: dispositivos.id,
          nombre: dispositivos.nombre,
          modelo: dispositivos.modelo,
          sistema: dispositivos.sistema,
          version_app: dispositivos.version_app,
          estado: dispositivos.estado,
          ultimo_sync: dispositivos.ultimo_sync,
          registros_pendientes: dispositivos.registros_pendientes,
          archivos_pendientes: dispositivos.archivos_pendientes,
          created_at: dispositivos.created_at,
        })
        .from(dispositivos)
        .where(eq(dispositivos.finca_id, req.usuario!.fincaId))
        .orderBy(desc(dispositivos.ultimo_sync)),
  );

  app.patch(
    '/:id',
    {
      preHandler: app.requiere('dispositivos:gestionar'),
      schema: {
        tags: ['dispositivos'],
        summary: 'Bloquear, reactivar o solicitar borrado remoto',
        params: z.object({ id: z.string().uuid() }),
        body: esquemaAccionDispositivo,
      },
    },
    async (req) => {
      const [d] = await app.db
        .update(dispositivos)
        .set({ estado: req.body.estado, updated_at: Date.now() })
        .where(eq(dispositivos.id, req.params.id))
        .returning();
      if (!d || d.finca_id !== req.usuario!.fincaId) throw noEncontrado('Dispositivo no encontrado');
      if (req.body.estado === 'borrado') await revocarTodos(app, 'dispositivo', d.id);
      await registrarBitacora(app.db, {
        fincaId: d.finca_id,
        usuarioId: req.usuario!.id,
        dispositivoId: d.id,
        accion: req.body.estado === 'borrado_solicitado' ? 'borrado_remoto' : 'editar',
        tabla: 'dispositivos',
        registroId: d.id,
        datos: { estado: req.body.estado },
      });
      return { ok: true, estado: d.estado };
    },
  );
}
