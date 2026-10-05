/**
 * Catálogos que el panel necesita para mostrar nombres (lotes, plagas, usuarios…).
 */
import { MODULOS } from '@kalo/shared';
import { and, asc, eq, isNull, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Ejecutor } from '../db/cliente';
import * as e from '../db/esquema';
import { semanaIso } from '@kalo/shared';

export async function cargarCatalogos(db: Ejecutor, fincaId: string) {
  const vivo = <T extends { deleted_at: unknown }>(t: T) => isNull(t.deleted_at as never);
  const deFinca = <T extends { finca_id: unknown; deleted_at: unknown }>(t: T) =>
    and(vivo(t), or(eq(t.finca_id as never, fincaId), isNull(t.finca_id as never)));
  const anio = semanaIso(new Date()).anio;

  const [
    lotes,
    plagas,
    colores,
    semanas,
    usuarios,
    roles,
    trabajadores,
    cuadrillas,
    tiposLabor,
    trampas,
    flags,
    parametros,
    fincas,
  ] = await Promise.all([
    db.select().from(e.lotes).where(deFinca(e.lotes)).orderBy(asc(e.lotes.codigo)),
    db.select().from(e.plagas).where(deFinca(e.plagas)).orderBy(asc(e.plagas.nombre)),
    db
      .select()
      .from(e.colores_cinta)
      .where(deFinca(e.colores_cinta))
      .orderBy(asc(e.colores_cinta.orden)),
    db
      .select()
      .from(e.semanas)
      .where(
        and(
          deFinca(e.semanas),
          or(eq(e.semanas.anio, anio), eq(e.semanas.anio, anio - 1), eq(e.semanas.anio, anio + 1)),
        ),
      )
      .orderBy(asc(e.semanas.anio), asc(e.semanas.numero)),
    db
      .select({
        id: e.usuarios.id,
        usuario: e.usuarios.usuario,
        nombre: e.usuarios.nombre,
        rol_id: e.usuarios.rol_id,
        activo: e.usuarios.activo,
        trabajador_id: e.usuarios.trabajador_id,
      })
      .from(e.usuarios)
      .where(deFinca(e.usuarios))
      .orderBy(asc(e.usuarios.nombre)),
    db.select().from(e.roles).where(vivo(e.roles)),
    db
      .select()
      .from(e.trabajadores)
      .where(deFinca(e.trabajadores))
      .orderBy(asc(e.trabajadores.nombre)),
    db.select().from(e.cuadrillas).where(deFinca(e.cuadrillas)),
    db.select().from(e.tipos_labor).where(deFinca(e.tipos_labor)),
    db.select().from(e.trampas).where(deFinca(e.trampas)).orderBy(asc(e.trampas.codigo_qr)),
    db.select().from(e.feature_flags).where(deFinca(e.feature_flags)),
    db.select().from(e.parametros).where(deFinca(e.parametros)),
    db.select().from(e.fincas).where(eq(e.fincas.id, fincaId)),
  ]);

  return {
    finca: fincas[0] ?? null,
    lotes: lotes.map(({ geom: _g, ...l }) => l),
    plagas,
    colores,
    semanas,
    usuarios,
    roles,
    trabajadores,
    cuadrillas,
    tiposLabor,
    trampas: trampas.map(({ geom: _g, ...t }) => t),
    flags,
    parametros,
    modulos: MODULOS,
  };
}

export type Catalogos = Awaited<ReturnType<typeof cargarCatalogos>>;

export default async function rutasCatalogos(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: app.autenticarUsuario,
      schema: { tags: ['catalogos'], summary: 'Catálogos de la finca' },
    },
    async (req) => cargarCatalogos(app.db, req.usuario!.fincaId),
  );
}
