/**
 * Bandeja del supervisor: validación de registros críticos y conflictos de sincronización.
 */
import {
  esquemaResolverConflicto,
  esquemaValidarRegistro,
  esTablaSincronizable,
  REGISTRO_TABLAS,
  TABLAS_CRITICAS,
  tienePermiso,
  type NombreTabla,
} from '@kalo/shared';
import { and, asc, desc, eq, getTableColumns, isNull, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { registrarBitacora } from '../bitacora/servicio';
import { bitacora } from '../db/esquema';
import { noEncontrado, prohibido, solicitudInvalida } from '../lib/errores';
import { escrituraSincronizada } from '../sync/repositorio-drizzle';
import { aBaseDatos, TABLAS_DRIZZLE } from '../sync/tablas';

/** Permiso para validar cada tabla crítica. */
export const PERMISO_VALIDAR: Partial<Record<NombreTabla, string>> = {
  cosecha: 'cosecha:validar',
  labores: 'labores:validar',
  alertas_fusarium: 'fusarium:gestionar',
};

const col = (t: NombreTabla, c: string) =>
  (getTableColumns(TABLAS_DRIZZLE[t]) as Record<string, PgColumn>)[c]!;

export default async function rutasValidacion(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/pendientes',
    {
      preHandler: app.requiere('validacion:ver'),
      schema: { tags: ['validacion'], summary: 'Registros críticos pendientes de validar' },
    },
    async (req) => {
      const u = req.usuario!;
      const salida: Record<string, unknown[]> = {};
      for (const tabla of TABLAS_CRITICAS) {
        const permiso = PERMISO_VALIDAR[tabla];
        if (permiso && !tienePermiso(u.permisos, permiso)) continue;
        const cond: SQL[] = [
          eq(col(tabla, 'finca_id'), u.fincaId),
          eq(col(tabla, 'estado_validacion'), 'pendiente'),
          isNull(col(tabla, 'deleted_at')),
        ];
        const filas = await app.db
          .select()
          .from(TABLAS_DRIZZLE[tabla])
          .where(and(...cond))
          .orderBy(asc(col(tabla, 'created_at')))
          .limit(500);
        salida[tabla] = filas.map(({ geom: _g, ...r }) => r);
      }
      return salida;
    },
  );

  app.post(
    '/:tabla/:id',
    {
      preHandler: app.autenticarUsuario,
      schema: {
        tags: ['validacion'],
        summary: 'Validar o rechazar un registro',
        params: z.object({ tabla: z.string(), id: z.string().uuid() }),
        body: esquemaValidarRegistro,
      },
    },
    async (req) => {
      const u = req.usuario!;
      const tabla = req.params.tabla as NombreTabla;
      const permiso = PERMISO_VALIDAR[tabla];
      if (!permiso) throw noEncontrado('La tabla no requiere validación');
      if (!tienePermiso(u.permisos, permiso)) throw prohibido();
      if (req.body.decision === 'rechazado' && !req.body.motivo) {
        throw solicitudInvalida('Indique el motivo del rechazo');
      }
      const actualizado = await escrituraSincronizada(app.db, u.fincaId, async (tx, ahora) => {
        const r = await tx
          .update(TABLAS_DRIZZLE[tabla])
          .set({
            estado_validacion: req.body.decision,
            validado_por: u.id,
            validado_en: ahora,
            motivo_rechazo: req.body.decision === 'rechazado' ? req.body.motivo : null,
            server_updated_at: ahora,
          } as never)
          .where(and(eq(col(tabla, 'id'), req.params.id), eq(col(tabla, 'finca_id'), u.fincaId)))
          .returning({ id: col(tabla, 'id') });
        if (r.length > 0) {
          await registrarBitacora(tx, {
            fincaId: u.fincaId,
            usuarioId: u.id,
            accion: req.body.decision === 'validado' ? 'validar' : 'rechazar',
            tabla,
            registroId: req.params.id,
            datos: { motivo: req.body.motivo },
          });
        }
        return r.length > 0;
      });
      if (!actualizado) throw noEncontrado('Registro no encontrado');
      return { ok: true };
    },
  );

  app.get(
    '/conflictos',
    {
      preHandler: app.requiere('validacion:ver'),
      schema: {
        tags: ['validacion'],
        summary: 'Conflictos de sincronización por revisar',
        querystring: z.object({ incluir_resueltos: z.coerce.boolean().default(false) }),
      },
    },
    async (req) => {
      const cond: SQL[] = [
        eq(bitacora.finca_id, req.usuario!.fincaId),
        eq(bitacora.accion, 'conflicto'),
        eq(bitacora.requiere_revision, true),
      ];
      if (!req.query.incluir_resueltos) cond.push(isNull(bitacora.resuelto_en));
      return app.db
        .select()
        .from(bitacora)
        .where(and(...cond))
        .orderBy(desc(bitacora.created_at))
        .limit(200);
    },
  );

  app.post(
    '/conflictos/:id/resolver',
    {
      preHandler: app.requiere('conflictos:resolver'),
      schema: {
        tags: ['validacion'],
        summary: 'Resuelve un conflicto fijando los valores finales',
        params: z.object({ id: z.string().uuid() }),
        body: esquemaResolverConflicto,
      },
    },
    async (req) => {
      const u = req.usuario!;
      const [c] = await app.db
        .select()
        .from(bitacora)
        .where(and(eq(bitacora.id, req.params.id), eq(bitacora.finca_id, u.fincaId)));
      if (!c || c.accion !== 'conflicto' || !c.tabla || !c.registro_id)
        throw noEncontrado('Conflicto no encontrado');
      if (c.resuelto_en) throw solicitudInvalida('El conflicto ya fue resuelto');
      if (!esTablaSincronizable(c.tabla)) throw solicitudInvalida('Tabla desconocida');
      const tabla = c.tabla;
      const permitidas = Object.keys(REGISTRO_TABLAS[tabla].columnas);
      const valores = Object.fromEntries(
        Object.entries(req.body.valores).filter(([k]) => permitidas.includes(k)),
      );
      await escrituraSincronizada(app.db, u.fincaId, async (tx, ahora) => {
        if (Object.keys(valores).length > 0) {
          await tx
            .update(TABLAS_DRIZZLE[tabla])
            .set({
              ...aBaseDatos(tabla, valores, Object.keys(valores)),
              updated_at: ahora,
              server_updated_at: ahora,
            } as never)
            .where(eq(col(tabla, 'id'), c.registro_id!));
        }
        await tx
          .update(bitacora)
          .set({ resuelto_por: u.id, resuelto_en: ahora })
          .where(eq(bitacora.id, c.id));
        await registrarBitacora(tx, {
          fincaId: u.fincaId,
          usuarioId: u.id,
          accion: 'resolver_conflicto',
          tabla,
          registroId: c.registro_id!,
          datos: { conflicto: c.id, valores, nota: req.body.nota },
        });
      });
      return { ok: true };
    },
  );
}
