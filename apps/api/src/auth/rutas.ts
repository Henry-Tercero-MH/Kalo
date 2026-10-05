import {
  esquemaLogin,
  esquemaLoginGafete,
  esquemaRefresh,
  hashGafete,
  modulosPara,
} from '@kalo/shared';
import bcrypt from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { registrarBitacora } from '../bitacora/servicio';
import { usuarios } from '../db/esquema';
import { noAutorizado } from '../lib/errores';
import type { UsuarioSesion } from '../lib/tipos-fastify';
import { cargarUsuario } from './sesion';
import { consumirRefresh, emitirTokens, revocarTodos } from './tokens';

export function perfilPublico(u: UsuarioSesion) {
  return {
    id: u.id,
    nombre: u.nombre,
    usuario: u.usuario,
    rol: u.rol,
    fincaId: u.fincaId,
    empresaId: u.empresaId,
    permisos: [...u.permisos].sort(),
    plataformas: u.plataformas,
    // Los roles de campo (sin plataforma web) no ven módulos del panel.
    modulosWeb: u.plataformas.includes('web') ? modulosPara('web', u.permisos).map((m) => m.codigo) : [],
  };
}

// bcrypt de un PIN ficticio para igualar tiempos cuando el usuario no existe.
const HASH_FALSO = bcrypt.hashSync('0000', 10);

export default async function rutasAuth(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const limite = {
    rateLimit: { max: app.config.NODE_ENV === 'test' ? 1000 : 10, timeWindow: '1 minute' },
  };

  app.post(
    '/login',
    {
      config: limite,
      schema: { tags: ['auth'], summary: 'Inicio de sesión con usuario y PIN', body: esquemaLogin },
    },
    async (req) => {
      const [u] = await app.db
        .select({ id: usuarios.id, pin: usuarios.pin_hash, finca: usuarios.finca_id })
        .from(usuarios)
        .where(and(eq(usuarios.usuario, req.body.usuario.toLowerCase()), isNull(usuarios.deleted_at)));
      const ok = await bcrypt.compare(req.body.pin, u?.pin ?? HASH_FALSO);
      if (!u || !ok) throw noAutorizado('Usuario o PIN incorrecto');
      const sesion = await cargarUsuario(app, u.id);
      if (!sesion) throw noAutorizado('Usuario inactivo');
      await registrarBitacora(app.db, { fincaId: u.finca, usuarioId: u.id, accion: 'login' });
      return { ...(await emitirTokens(app, 'usuario', u.id)), usuario: perfilPublico(sesion) };
    },
  );

  app.post(
    '/gafete',
    {
      config: limite,
      schema: { tags: ['auth'], summary: 'Inicio de sesión con gafete QR', body: esquemaLoginGafete },
    },
    async (req) => {
      const [u] = await app.db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(and(eq(usuarios.gafete_hash, hashGafete(req.body.codigo)), isNull(usuarios.deleted_at)));
      const sesion = u ? await cargarUsuario(app, u.id) : null;
      if (!sesion) throw noAutorizado('Gafete no reconocido');
      return { ...(await emitirTokens(app, 'usuario', sesion.id)), usuario: perfilPublico(sesion) };
    },
  );

  app.post(
    '/refresh',
    { schema: { tags: ['auth'], summary: 'Renueva la sesión (rota el refresh token)', body: esquemaRefresh } },
    async (req) => {
      const id = await consumirRefresh(app, req.body.refreshToken, 'usuario');
      const sesion = await cargarUsuario(app, id);
      if (!sesion) throw noAutorizado('Usuario inactivo');
      return { ...(await emitirTokens(app, 'usuario', id)), usuario: perfilPublico(sesion) };
    },
  );

  app.post(
    '/logout',
    { preHandler: app.autenticarUsuario, schema: { tags: ['auth'], response: { 200: z.object({ ok: z.boolean() }) } } },
    async (req) => {
      await revocarTodos(app, 'usuario', req.usuario!.id);
      return { ok: true };
    },
  );

  app.get(
    '/yo',
    { preHandler: app.autenticarUsuario, schema: { tags: ['auth'], summary: 'Perfil y permisos' } },
    async (req) => perfilPublico(req.usuario!),
  );
}
