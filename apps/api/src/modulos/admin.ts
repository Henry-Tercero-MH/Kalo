/**
 * Administración: usuarios, roles y permisos, catálogos (lotes, plagas, labores, trampas),
 * calendario de semanas y colores de cinta, parámetros, feature flags y formularios.
 * Toda escritura incrementa `server_updated_at` (llega a los celulares) y queda en bitácora.
 */
import { randomBytes } from 'node:crypto';
import {
  esquemaDefinicionBase,
  esquemaDefinicionFormulario,
  esquemaFeatureFlag,
  esquemaLote,
  esquemaParametroEdicion,
  esquemaPlaga,
  esquemaRolPermisos,
  esquemaSemanaEdicion,
  esquemaTipoLabor,
  esquemaUsuarioEdicion,
  esquemaUsuarioNuevo,
  hashGafete,
  hashPinOffline,
  type NombreTabla,
} from '@kalo/shared';
import bcrypt from 'bcryptjs';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { invalidarCacheSesiones } from '../auth/sesion';
import { registrarBitacora } from '../bitacora/servicio';
import * as e from '../db/esquema';
import { noEncontrado, solicitudInvalida } from '../lib/errores';
import { escrituraSincronizada } from '../sync/repositorio-drizzle';
import { TABLAS_DRIZZLE } from '../sync/tablas';

const idParam = z.object({ id: z.string().uuid() });

export function credencialesUsuario(pin: string) {
  const sal = randomBytes(16).toString('hex');
  return {
    pin_hash: bcrypt.hashSync(pin, 10),
    pin_offline_sal: sal,
    pin_offline_hash: hashPinOffline(pin, sal),
  };
}

export default async function rutasAdmin(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /** CRUD genérico para catálogos simples sincronizados. */
  function catalogo<S extends z.ZodObject>(ruta: string, tabla: NombreTabla, esquema: S, permiso: string) {
    const t = TABLAS_DRIZZLE[tabla] as typeof e.plagas;
    app.post(
      `/${ruta}`,
      { preHandler: app.requiere(permiso), schema: { tags: ['admin'], summary: `Crear en ${tabla}`, body: esquema } },
      async (req) => {
        const u = req.usuario!;
        return escrituraSincronizada(app.db, u.fincaId, async (tx, ahora) => {
          const [fila] = await tx
            .insert(t)
            .values({
              ...(req.body as object),
              created_at: ahora,
              updated_at: ahora,
              server_updated_at: ahora,
              created_by: u.id,
              finca_id: u.fincaId,
            } as never)
            .returning({ id: t.id });
          await registrarBitacora(tx, { fincaId: u.fincaId, usuarioId: u.id, accion: 'crear', tabla, registroId: fila!.id });
          return fila;
        });
      },
    );
    app.patch(
      `/${ruta}/:id`,
      {
        preHandler: app.requiere(permiso),
        schema: { tags: ['admin'], summary: `Editar en ${tabla}`, params: idParam, body: esquema.partial() },
      },
      async (req) => {
        const u = req.usuario!;
        const ok = await escrituraSincronizada(app.db, u.fincaId, async (tx, ahora) => {
          const r = await tx
            .update(t)
            .set({ ...(req.body as object), updated_at: ahora, server_updated_at: ahora } as never)
            .where(eq(t.id, req.params.id))
            .returning({ id: t.id });
          if (r.length) {
            await registrarBitacora(tx, {
              fincaId: u.fincaId,
              usuarioId: u.id,
              accion: 'editar',
              tabla,
              registroId: req.params.id,
              datos: req.body,
            });
          }
          return r.length > 0;
        });
        if (!ok) throw noEncontrado();
        return { ok: true };
      },
    );
  }

  catalogo('lotes', 'lotes', esquemaLote, 'admin:catalogos');
  catalogo('plagas', 'plagas', esquemaPlaga, 'admin:catalogos');
  catalogo('tipos-labor', 'tipos_labor', esquemaTipoLabor, 'admin:catalogos');
  catalogo(
    'colores-cinta',
    'colores_cinta',
    z.object({
      nombre: z.string().min(1),
      hex: z.string().regex(/^#[0-9a-f]{6}$/i),
      orden: z.number().int(),
      pendiente_confirmar: z.boolean(),
    }),
    'admin:catalogos',
  );

  // ─── Usuarios ────────────────────────────────────────────────────────────
  app.get(
    '/usuarios',
    { preHandler: app.requiere('admin:usuarios'), schema: { tags: ['admin'], summary: 'Usuarios' } },
    async (req) =>
      app.db
        .select({
          id: e.usuarios.id,
          usuario: e.usuarios.usuario,
          nombre: e.usuarios.nombre,
          rol_id: e.usuarios.rol_id,
          finca_id: e.usuarios.finca_id,
          activo: e.usuarios.activo,
          trabajador_id: e.usuarios.trabajador_id,
          tiene_gafete: e.usuarios.gafete_hash,
        })
        .from(e.usuarios)
        .where(and(eq(e.usuarios.empresa_id, req.usuario!.empresaId), isNull(e.usuarios.deleted_at)))
        .orderBy(asc(e.usuarios.nombre))
        .then((xs) => xs.map((x) => ({ ...x, tiene_gafete: Boolean(x.tiene_gafete) }))),
  );

  app.post(
    '/usuarios',
    { preHandler: app.requiere('admin:usuarios'), schema: { tags: ['admin'], summary: 'Crear usuario', body: esquemaUsuarioNuevo } },
    async (req) => {
      const u = req.usuario!;
      const { pin, ...datos } = req.body;
      const [existe] = await app.db.select({ id: e.usuarios.id }).from(e.usuarios).where(eq(e.usuarios.usuario, datos.usuario));
      if (existe) throw solicitudInvalida('Ese nombre de usuario ya existe');
      return escrituraSincronizada(app.db, datos.finca_id, async (tx, ahora) => {
        const [fila] = await tx
          .insert(e.usuarios)
          .values({
            ...datos,
            ...credencialesUsuario(pin),
            empresa_id: u.empresaId,
            created_at: ahora,
            updated_at: ahora,
            server_updated_at: ahora,
            created_by: u.id,
          })
          .returning({ id: e.usuarios.id });
        await registrarBitacora(tx, { fincaId: datos.finca_id, usuarioId: u.id, accion: 'crear', tabla: 'usuarios', registroId: fila!.id });
        return fila;
      });
    },
  );

  app.patch(
    '/usuarios/:id',
    {
      preHandler: app.requiere('admin:usuarios'),
      schema: { tags: ['admin'], summary: 'Editar usuario (rol, PIN, activo)', params: idParam, body: esquemaUsuarioEdicion },
    },
    async (req) => {
      const u = req.usuario!;
      const { pin, ...datos } = req.body;
      await escrituraSincronizada(app.db, u.fincaId, async (tx, ahora) => {
        const r = await tx
          .update(e.usuarios)
          .set({ ...datos, ...(pin ? credencialesUsuario(pin) : {}), updated_at: ahora, server_updated_at: ahora })
          .where(and(eq(e.usuarios.id, req.params.id), eq(e.usuarios.empresa_id, u.empresaId)))
          .returning({ id: e.usuarios.id });
        if (!r.length) throw noEncontrado('Usuario no encontrado');
        await registrarBitacora(tx, {
          fincaId: u.fincaId,
          usuarioId: u.id,
          accion: 'editar',
          tabla: 'usuarios',
          registroId: req.params.id,
          datos: { ...datos, pin: pin ? '(cambiado)' : undefined },
        });
      });
      invalidarCacheSesiones();
      return { ok: true };
    },
  );

  app.post(
    '/usuarios/:id/gafete',
    {
      preHandler: app.requiere('admin:usuarios'),
      schema: { tags: ['admin'], summary: 'Genera un gafete QR nuevo (devuelve el contenido del QR)', params: idParam },
    },
    async (req) => {
      const codigo = `KALO-GAFETE:${req.params.id}:${randomBytes(12).toString('hex')}`;
      await escrituraSincronizada(app.db, req.usuario!.fincaId, (tx, ahora) =>
        tx
          .update(e.usuarios)
          .set({ gafete_hash: hashGafete(codigo), updated_at: ahora, server_updated_at: ahora })
          .where(eq(e.usuarios.id, req.params.id)),
      );
      return { codigo };
    },
  );

  // ─── Roles y permisos ────────────────────────────────────────────────────
  app.get(
    '/roles',
    { preHandler: app.requiere('admin:roles'), schema: { tags: ['admin'], summary: 'Roles con sus permisos' } },
    async () => {
      const [roles, permisos, asignados] = await Promise.all([
        app.db.select().from(e.roles).where(isNull(e.roles.deleted_at)),
        app.db.select().from(e.permisos).where(isNull(e.permisos.deleted_at)).orderBy(asc(e.permisos.codigo)),
        app.db.select().from(e.rol_permisos).where(isNull(e.rol_permisos.deleted_at)),
      ]);
      const porId = new Map(permisos.map((p) => [p.id, p.codigo]));
      return {
        permisos,
        roles: roles.map((r) => ({
          ...r,
          permisos: asignados.filter((a) => a.rol_id === r.id).map((a) => porId.get(a.permiso_id)).filter(Boolean),
        })),
      };
    },
  );

  app.put(
    '/roles/:id/permisos',
    {
      preHandler: app.requiere('admin:roles'),
      schema: { tags: ['admin'], summary: 'Reemplaza los permisos de un rol', params: idParam, body: esquemaRolPermisos },
    },
    async (req) => {
      const u = req.usuario!;
      await escrituraSincronizada(app.db, u.fincaId, async (tx, ahora) => {
        const permisos = req.body.permisos.length
          ? await tx.select().from(e.permisos).where(inArray(e.permisos.codigo, req.body.permisos))
          : [];
        const deseados = new Set(permisos.map((p) => p.id));
        const actuales = await tx.select().from(e.rol_permisos).where(eq(e.rol_permisos.rol_id, req.params.id));
        for (const a of actuales) {
          const debe = deseados.has(a.permiso_id);
          if (debe && a.deleted_at) {
            await tx.update(e.rol_permisos).set({ deleted_at: null, updated_at: ahora, server_updated_at: ahora }).where(eq(e.rol_permisos.id, a.id));
          } else if (!debe && !a.deleted_at) {
            await tx.update(e.rol_permisos).set({ deleted_at: ahora, updated_at: ahora, server_updated_at: ahora }).where(eq(e.rol_permisos.id, a.id));
          }
          deseados.delete(a.permiso_id);
        }
        for (const permiso_id of deseados) {
          await tx.insert(e.rol_permisos).values({
            rol_id: req.params.id,
            permiso_id,
            created_at: ahora,
            updated_at: ahora,
            server_updated_at: ahora,
            created_by: u.id,
          });
        }
        await registrarBitacora(tx, {
          fincaId: u.fincaId,
          usuarioId: u.id,
          accion: 'editar',
          tabla: 'rol_permisos',
          registroId: req.params.id,
          datos: { permisos: req.body.permisos },
        });
      });
      invalidarCacheSesiones();
      return { ok: true };
    },
  );

  // ─── Calendario ──────────────────────────────────────────────────────────
  app.patch(
    '/semanas/:id',
    {
      preHandler: app.requiere('admin:catalogos'),
      schema: { tags: ['admin'], summary: 'Editar color de cinta o factor de una semana', params: idParam, body: esquemaSemanaEdicion },
    },
    async (req) => {
      const u = req.usuario!;
      await escrituraSincronizada(app.db, u.fincaId, async (tx, ahora) => {
        await tx.update(e.semanas).set({ ...req.body, updated_at: ahora, server_updated_at: ahora }).where(eq(e.semanas.id, req.params.id));
        await registrarBitacora(tx, { fincaId: u.fincaId, usuarioId: u.id, accion: 'editar', tabla: 'semanas', registroId: req.params.id, datos: req.body });
      });
      return { ok: true };
    },
  );

  // ─── Parámetros y feature flags ──────────────────────────────────────────
  app.patch(
    '/parametros/:id',
    {
      preHandler: app.requiere('admin:parametros'),
      schema: { tags: ['admin'], summary: 'Editar un parámetro', params: idParam, body: esquemaParametroEdicion },
    },
    async (req) => {
      const u = req.usuario!;
      await escrituraSincronizada(app.db, u.fincaId, async (tx, ahora) => {
        await tx
          .update(e.parametros)
          .set({ valor: req.body.valor as object, updated_at: ahora, server_updated_at: ahora })
          .where(eq(e.parametros.id, req.params.id));
        await registrarBitacora(tx, { fincaId: u.fincaId, usuarioId: u.id, accion: 'editar', tabla: 'parametros', registroId: req.params.id, datos: req.body });
      });
      return { ok: true };
    },
  );

  app.put(
    '/feature-flags',
    {
      preHandler: app.requiere('admin:parametros'),
      schema: { tags: ['admin'], summary: 'Activa o desactiva un módulo (por rol opcional)', body: esquemaFeatureFlag },
    },
    async (req) => {
      const u = req.usuario!;
      await escrituraSincronizada(app.db, u.fincaId, async (tx, ahora) => {
        const rol = req.body.rol_id ?? null;
        const [existente] = await tx
          .select()
          .from(e.feature_flags)
          .where(
            and(
              eq(e.feature_flags.codigo, req.body.codigo),
              eq(e.feature_flags.finca_id, u.fincaId),
              rol ? eq(e.feature_flags.rol_id, rol) : isNull(e.feature_flags.rol_id),
            ),
          );
        if (existente) {
          await tx
            .update(e.feature_flags)
            .set({ activo: req.body.activo, deleted_at: null, updated_at: ahora, server_updated_at: ahora })
            .where(eq(e.feature_flags.id, existente.id));
        } else {
          await tx.insert(e.feature_flags).values({
            codigo: req.body.codigo,
            rol_id: rol,
            activo: req.body.activo,
            finca_id: u.fincaId,
            created_at: ahora,
            updated_at: ahora,
            server_updated_at: ahora,
            created_by: u.id,
          });
        }
        await registrarBitacora(tx, { fincaId: u.fincaId, usuarioId: u.id, accion: 'editar', tabla: 'feature_flags', datos: req.body });
      });
      return { ok: true };
    },
  );

  // ─── Formularios dinámicos ───────────────────────────────────────────────
  app.get(
    '/formularios',
    { preHandler: app.requiere('admin:formularios'), schema: { tags: ['admin'], summary: 'Definiciones de formulario' } },
    async () =>
      app.db
        .select()
        .from(e.definiciones_formulario)
        .where(isNull(e.definiciones_formulario.deleted_at))
        .orderBy(asc(e.definiciones_formulario.codigo), desc(e.definiciones_formulario.version)),
  );

  app.post(
    '/formularios',
    {
      preHandler: app.requiere('admin:formularios'),
      schema: {
        tags: ['admin'],
        summary: 'Publica una versión nueva de un formulario (llega a los celulares al sincronizar)',
        body: esquemaDefinicionBase.omit({ version: true }),
      },
    },
    async (req) => {
      const u = req.usuario!;
      return escrituraSincronizada(app.db, u.fincaId, async (tx, ahora) => {
        const previas = await tx
          .select()
          .from(e.definiciones_formulario)
          .where(eq(e.definiciones_formulario.codigo, req.body.codigo))
          .orderBy(desc(e.definiciones_formulario.version));
        const version = (previas[0]?.version ?? 0) + 1;
        const definicion = esquemaDefinicionFormulario.parse({ ...req.body, version });
        // La versión anterior queda inactiva (los registros viejos conservan su versión).
        for (const p of previas.filter((x) => x.activo)) {
          await tx
            .update(e.definiciones_formulario)
            .set({ activo: false, updated_at: ahora, server_updated_at: ahora })
            .where(eq(e.definiciones_formulario.id, p.id));
        }
        const [fila] = await tx
          .insert(e.definiciones_formulario)
          .values({
            codigo: definicion.codigo,
            version,
            titulo: definicion.titulo,
            definicion,
            activo: true,
            created_at: ahora,
            updated_at: ahora,
            server_updated_at: ahora,
            created_by: u.id,
          })
          .returning({ id: e.definiciones_formulario.id });
        await registrarBitacora(tx, {
          fincaId: u.fincaId,
          usuarioId: u.id,
          accion: 'crear',
          tabla: 'definiciones_formulario',
          registroId: fila!.id,
          datos: { codigo: definicion.codigo, version },
        });
        return { id: fila!.id, version };
      });
    },
  );

  // ─── Bitácora ────────────────────────────────────────────────────────────
  app.get(
    '/bitacora',
    {
      preHandler: app.requiere('admin:usuarios'),
      schema: {
        tags: ['admin'],
        summary: 'Bitácora de auditoría',
        querystring: z.object({ limite: z.coerce.number().int().min(1).max(1000).default(200) }),
      },
    },
    async (req) =>
      app.db
        .select()
        .from(e.bitacora)
        .where(eq(e.bitacora.finca_id, req.usuario!.fincaId))
        .orderBy(desc(e.bitacora.created_at))
        .limit(req.query.limite),
  );
}
