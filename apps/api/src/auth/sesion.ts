/**
 * Carga de la sesión (usuario o dispositivo) y verificación de permisos.
 * Los permisos se leen de la base de datos (rol_permisos) con una caché corta.
 */
import { tienePermiso } from '@kalo/shared';
import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { dispositivos, fincas, roles, usuarios } from '../db/esquema';
import { noAutorizado, prohibido } from '../lib/errores';
import type { UsuarioSesion } from '../lib/tipos-fastify';
import { permisosDeUsuarios } from '../sync/repositorio-drizzle';

const CACHE_MS = 30_000;
const cache = new Map<string, { sesion: UsuarioSesion; hasta: number }>();

export function invalidarCacheSesiones() {
  cache.clear();
}

export async function cargarUsuario(
  app: FastifyInstance,
  id: string,
): Promise<UsuarioSesion | null> {
  const enCache = cache.get(id);
  if (enCache && enCache.hasta > Date.now()) return enCache.sesion;
  const [u] = await app.db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      usuario: usuarios.usuario,
      fincaId: usuarios.finca_id,
      empresaId: usuarios.empresa_id,
      rolId: usuarios.rol_id,
      rol: roles.codigo,
      plataformas: roles.plataformas,
      activo: usuarios.activo,
    })
    .from(usuarios)
    .innerJoin(roles, eq(roles.id, usuarios.rol_id))
    .where(and(eq(usuarios.id, id), isNull(usuarios.deleted_at)));
  if (!u || !u.activo || !u.fincaId) return null;
  const permisos = (await permisosDeUsuarios(app.db, [id])).get(id)?.permisos ?? new Set<string>();
  const sesion: UsuarioSesion = {
    id: u.id,
    nombre: u.nombre,
    usuario: u.usuario,
    fincaId: u.fincaId,
    empresaId: u.empresaId,
    rolId: u.rolId,
    rol: u.rol,
    plataformas: Array.isArray(u.plataformas) ? (u.plataformas as string[]) : [],
    permisos: new Set(permisos),
  };
  cache.set(id, { sesion, hasta: Date.now() + CACHE_MS });
  return sesion;
}

async function verificarJwt(req: FastifyRequest, tipo: 'usuario' | 'dispositivo') {
  try {
    await req.jwtVerify();
  } catch {
    throw noAutorizado();
  }
  if (req.user.typ !== tipo) throw noAutorizado('Credencial no válida para esta operación');
  return req.user.sub;
}

export default fp(async (app: FastifyInstance) => {
  app.decorate('autenticarUsuario', async (req: FastifyRequest) => {
    const id = await verificarJwt(req, 'usuario');
    const sesion = await cargarUsuario(app, id);
    if (!sesion) throw noAutorizado('Usuario inactivo');
    req.usuario = sesion;
  });

  app.decorate('autenticarDispositivo', async (req: FastifyRequest) => {
    const id = await verificarJwt(req, 'dispositivo');
    const [d] = await app.db
      .select({
        id: dispositivos.id,
        fincaId: dispositivos.finca_id,
        empresaId: fincas.empresa_id,
        estado: dispositivos.estado,
      })
      .from(dispositivos)
      .innerJoin(fincas, eq(fincas.id, dispositivos.finca_id))
      .where(eq(dispositivos.id, id));
    if (!d || d.estado === 'borrado') throw noAutorizado('Dispositivo no registrado');
    req.dispositivo = d;
  });

  app.decorate('requiere', (...requeridos: string[]) => async (req: FastifyRequest) => {
    await app.autenticarUsuario(req);
    const permisos = req.usuario!.permisos;
    if (!requeridos.every((p) => tienePermiso(permisos, p))) throw prohibido();
  });
});
