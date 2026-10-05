/**
 * Capas GeoJSON del mapa de la finca (lotes por estado de plagas, rutas, registros, cobertura).
 */
import { semanaIso } from '@kalo/shared';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ZONA_HORARIA } from '../cobertura/servicio';

const rango = z.object({
  desde: z.string().date().optional(),
  hasta: z.string().date().optional(),
});

function fechas(q: { desde?: string; hasta?: string }, diasPorDefecto: number) {
  const hasta = q.hasta ?? new Date().toISOString().slice(0, 10);
  const desde =
    q.desde ?? new Date(Date.now() - diasPorDefecto * 86_400_000).toISOString().slice(0, 10);
  return { desde, hasta };
}

export default async function rutasMapa(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/lotes',
    {
      preHandler: app.requiere('mapa:ver'),
      schema: {
        tags: ['mapa'],
        summary: 'Lotes con el último estado de plagas y la cobertura de la semana',
        querystring: z.object({ dias: z.coerce.number().int().min(1).max(120).default(14) }),
      },
    },
    async (req) => {
      const fincaId = req.usuario!.fincaId;
      const s = semanaIso(new Date());
      const filas = await app.db.execute<{ feature: unknown }>(sql`
        WITH ultimos AS (
          SELECT DISTINCT ON (m.lote_id, m.plaga_id)
            m.lote_id, m.plaga_id, m.incidencia, m.fecha, p.nombre, p.umbral_alerta
          FROM muestreos m JOIN plagas p ON p.id = m.plaga_id
          WHERE m.finca_id = ${fincaId} AND m.deleted_at IS NULL
            AND m.fecha >= (current_date - ${req.query.dias}::int)
          ORDER BY m.lote_id, m.plaga_id, m.fecha DESC, m.created_at DESC
        ),
        estado AS (
          SELECT lote_id,
            max(fecha) AS ultima_fecha,
            max(incidencia / NULLIF(umbral_alerta, 0)) AS indice,
            jsonb_agg(jsonb_build_object('plaga', nombre, 'incidencia', incidencia, 'umbral', umbral_alerta, 'fecha', fecha)
              ORDER BY incidencia / NULLIF(umbral_alerta, 0) DESC) AS plagas
          FROM ultimos GROUP BY lote_id
        ),
        fusarium AS (
          SELECT lote_id, count(*) AS abiertas FROM alertas_fusarium
          WHERE finca_id = ${fincaId} AND deleted_at IS NULL AND estado IN ('sospecha', 'en_revision')
          GROUP BY lote_id
        )
        SELECT jsonb_build_object(
          'type', 'Feature',
          'id', l.id,
          'geometry', ST_AsGeoJSON(l.geom, 6)::jsonb,
          'properties', jsonb_build_object(
            'id', l.id, 'codigo', l.codigo, 'nombre', l.nombre, 'hectareas', l.hectareas,
            'poblacion', l.poblacion,
            'estado', CASE
              WHEN e.indice IS NULL THEN 'SIN DATOS'
              WHEN e.indice >= 1 THEN 'ALERTA'
              WHEN e.indice >= 0.5 THEN 'VIGILANCIA'
              ELSE 'NORMAL' END,
            'indice', e.indice, 'ultima_fecha', e.ultima_fecha, 'plagas', COALESCE(e.plagas, '[]'::jsonb),
            'fusarium_abiertas', COALESCE(f.abiertas, 0),
            'cobertura', c.porcentaje
          )
        ) AS feature
        FROM lotes l
        LEFT JOIN estado e ON e.lote_id = l.id
        LEFT JOIN fusarium f ON f.lote_id = l.id
        LEFT JOIN cobertura_lote c ON c.lote_id = l.id AND c.anio = ${s.anio} AND c.semana = ${s.numero}
        WHERE l.finca_id = ${fincaId} AND l.deleted_at IS NULL
        ORDER BY l.codigo
      `);
      return { type: 'FeatureCollection', features: [...filas].map((f) => f.feature) };
    },
  );

  app.get(
    '/rutas',
    {
      preHandler: app.requiere('mapa:ver'),
      schema: { tags: ['mapa'], summary: 'Rutas recorridas (LineString)', querystring: rango },
    },
    async (req) => {
      const { desde, hasta } = fechas(req.query, 7);
      const filas = await app.db.execute<{ feature: unknown }>(sql`
        SELECT jsonb_build_object(
          'type', 'Feature', 'id', r.id,
          'geometry', ST_AsGeoJSON(ST_MakeLine(p.geom ORDER BY p.secuencia), 6)::jsonb,
          'properties', jsonb_build_object('id', r.id, 'tarea', r.tarea, 'usuario', u.nombre,
            'inicio', r.inicio, 'fin', r.fin, 'distancia_m', r.distancia_m, 'lote_id', r.lote_id)
        ) AS feature
        FROM rutas r
        JOIN puntos_ruta p ON p.ruta_id = r.id AND p.deleted_at IS NULL
        LEFT JOIN usuarios u ON u.id = r.usuario_id
        WHERE r.finca_id = ${req.usuario!.fincaId} AND r.deleted_at IS NULL
          AND (to_timestamp(r.inicio / 1000.0) AT TIME ZONE ${ZONA_HORARIA})::date BETWEEN ${desde}::date AND ${hasta}::date
        GROUP BY r.id, u.nombre
        HAVING count(p.id) >= 2
      `);
      return { type: 'FeatureCollection', features: [...filas].map((f) => f.feature) };
    },
  );

  app.get(
    '/registros',
    {
      preHandler: app.requiere('mapa:ver'),
      schema: {
        tags: ['mapa'],
        summary: 'Registros recientes con ubicación (puntos)',
        querystring: rango,
      },
    },
    async (req) => {
      const { desde, hasta } = fechas(req.query, 7);
      const f = req.usuario!.fincaId;
      const filas = await app.db.execute<{ feature: unknown }>(sql`
        SELECT jsonb_build_object('type', 'Feature', 'id', id,
          'geometry', ST_AsGeoJSON(geom, 6)::jsonb,
          'properties', jsonb_build_object('id', id, 'tipo', tipo, 'fecha', fecha, 'detalle', detalle)) AS feature
        FROM (
          SELECT m.id, m.geom, 'muestreo' AS tipo, m.fecha, p.nombre || ' ' || m.incidencia || ' %' AS detalle
            FROM muestreos m JOIN plagas p ON p.id = m.plaga_id
            WHERE m.finca_id = ${f} AND m.deleted_at IS NULL AND m.geom IS NOT NULL AND m.fecha BETWEEN ${desde}::date AND ${hasta}::date
          UNION ALL
          SELECT a.id, a.geom, 'fusarium', a.fecha, 'Fusarium: ' || a.estado
            FROM alertas_fusarium a
            WHERE a.finca_id = ${f} AND a.deleted_at IS NULL AND a.geom IS NOT NULL
          UNION ALL
          SELECT t.id, t.geom, 'trampa', NULL, t.codigo_qr FROM trampas t WHERE t.finca_id = ${f} AND t.deleted_at IS NULL
        ) x
      `);
      return { type: 'FeatureCollection', features: [...filas].map((x) => x.feature) };
    },
  );

  app.get(
    '/cobertura',
    {
      preHandler: app.requiere('mapa:ver'),
      schema: {
        tags: ['mapa'],
        summary: 'Cobertura por lote y semana',
        querystring: z.object({
          anio: z.coerce.number().int().optional(),
          semana: z.coerce.number().int().min(1).max(53).optional(),
        }),
      },
    },
    async (req) => {
      const s = semanaIso(new Date());
      const anio = req.query.anio ?? s.anio;
      const semana = req.query.semana ?? s.numero;
      const filas = await app.db.execute<{ feature: unknown }>(sql`
        SELECT jsonb_build_object('type', 'Feature', 'id', c.id, 'geometry', c.celdas,
          'properties', jsonb_build_object('lote_id', c.lote_id, 'codigo', l.codigo, 'porcentaje', c.porcentaje,
            'celdas_total', c.celdas_total, 'celdas_recorridas', c.celdas_recorridas)) AS feature
        FROM cobertura_lote c JOIN lotes l ON l.id = c.lote_id
        WHERE c.finca_id = ${req.usuario!.fincaId} AND c.anio = ${anio} AND c.semana = ${semana}
      `);
      return {
        anio,
        semana,
        type: 'FeatureCollection',
        features: [...filas].map((x) => x.feature),
      };
    },
  );
}
