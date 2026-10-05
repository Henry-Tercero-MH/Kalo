/**
 * Tablas de registros por módulo con filtros (fecha, lote, usuario) y exportación a Excel/CSV.
 */
import {
  esquemaFiltrosRegistros,
  formatearFechaHora,
  MODULOS,
  REGISTRO_TABLAS,
  tienePermiso,
  type FiltrosRegistros,
  type NombreTabla,
} from '@kalo/shared';
import { and, desc, eq, getTableColumns, gte, isNull, lte, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import ExcelJS from 'exceljs';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Ejecutor } from '../db/cliente';
import { noEncontrado, prohibido } from '../lib/errores';
import type { UsuarioSesion } from '../lib/tipos-fastify';
import { TABLAS_DRIZZLE } from '../sync/tablas';
import { cargarCatalogos, type Catalogos } from './catalogos';

/** Tablas consultables desde el panel y el permiso de lectura de cada una. */
export const TABLAS_REGISTROS: Partial<Record<NombreTabla, string>> = Object.fromEntries(
  MODULOS.flatMap((m) =>
    m.tablas
      .filter((t) => REGISTRO_TABLAS[t].meta.direccion === 'ambas')
      .map((t) => [t, m.permisos.find((p) => p.codigo.endsWith(':ver'))?.codigo ?? m.permisoVer]),
  ).filter(([t]) => !['puntos_ruta', 'archivos', 'consentimientos'].includes(t as string)),
);

function columna(tabla: NombreTabla, nombre: string): PgColumn | undefined {
  return (getTableColumns(TABLAS_DRIZZLE[tabla]) as Record<string, PgColumn>)[nombre];
}

export function verificarAcceso(usuario: UsuarioSesion, tabla: string): NombreTabla {
  if (!(tabla in TABLAS_REGISTROS)) throw noEncontrado('Módulo sin tabla de registros');
  const permiso = TABLAS_REGISTROS[tabla as NombreTabla];
  if (!tienePermiso(usuario.permisos, 'registros:ver') || (permiso && !tienePermiso(usuario.permisos, permiso))) {
    throw prohibido();
  }
  return tabla as NombreTabla;
}

export async function consultarRegistros(
  db: Ejecutor,
  tabla: NombreTabla,
  fincaId: string,
  f: FiltrosRegistros,
) {
  const t = TABLAS_DRIZZLE[tabla];
  const cond: SQL[] = [eq(columna(tabla, 'finca_id')!, fincaId), isNull(columna(tabla, 'deleted_at')!)];
  const fecha = columna(tabla, 'fecha');
  if (fecha && f.desde) cond.push(gte(fecha, f.desde));
  if (fecha && f.hasta) cond.push(lte(fecha, f.hasta));
  if (!fecha && f.desde) cond.push(gte(columna(tabla, 'created_at')!, new Date(f.desde).getTime()));
  if (!fecha && f.hasta) cond.push(lte(columna(tabla, 'created_at')!, new Date(f.hasta).getTime() + 86_399_999));
  const lote = columna(tabla, 'lote_id');
  if (lote && f.lote_id) cond.push(eq(lote, f.lote_id));
  if (f.usuario_id) cond.push(eq(columna(tabla, 'created_by')!, f.usuario_id));
  const validacion = columna(tabla, 'estado_validacion');
  if (validacion && f.estado_validacion) cond.push(eq(validacion, f.estado_validacion));

  const filas = await db
    .select()
    .from(t)
    .where(and(...cond))
    .orderBy(desc(fecha ?? columna(tabla, 'created_at')!), desc(columna(tabla, 'created_at')!))
    .limit(f.limite);
  return filas.map((fila) => {
    const { geom: _g, ...resto } = fila as Record<string, unknown>;
    return resto;
  });
}

const ETIQUETAS: Record<string, string> = {
  fecha: 'Fecha',
  lote_id: 'Lote',
  plaga_id: 'Plaga',
  trampa_id: 'Trampa',
  color_cinta_id: 'Cinta',
  tipo_labor_id: 'Labor',
  trabajador_id: 'Trabajador',
  cuadrilla_id: 'Cuadrilla',
  created_by: 'Registrado por',
  asignado_a: 'Asignado a',
  usuario_id: 'Usuario',
  estado_validacion: 'Validación',
  created_at: 'Hora del dispositivo',
  hora_gps: 'Hora GPS',
  device_id: 'Dispositivo',
  validado_por: 'Validado por',
  validado_en: 'Validado en',
  motivo_rechazo: 'Motivo de rechazo',
  precision_gps: 'Precisión GPS (m)',
};

/** Reemplaza ids por nombres para exportar. */
function resolver(c: Catalogos) {
  const mapa = (xs: { id: string }[], f: (x: never) => string) =>
    new Map(xs.map((x) => [x.id, f(x as never)]));
  const nombres: Record<string, Map<string, string>> = {
    lote_id: mapa(c.lotes, (l: { codigo: string; nombre: string }) => `${l.codigo} ${l.nombre}`),
    plaga_id: mapa(c.plagas, (p: { nombre: string }) => p.nombre),
    trampa_id: mapa(c.trampas, (t: { codigo_qr: string }) => t.codigo_qr),
    color_cinta_id: mapa(c.colores, (x: { nombre: string }) => x.nombre),
    tipo_labor_id: mapa(c.tiposLabor, (x: { nombre: string }) => x.nombre),
    trabajador_id: mapa(c.trabajadores, (x: { nombre: string }) => x.nombre),
    cuadrilla_id: mapa(c.cuadrillas, (x: { nombre: string }) => x.nombre),
    created_by: mapa(c.usuarios, (x: { nombre: string }) => x.nombre),
    validado_por: mapa(c.usuarios, (x: { nombre: string }) => x.nombre),
    asignado_a: mapa(c.usuarios, (x: { nombre: string }) => x.nombre),
    usuario_id: mapa(c.usuarios, (x: { nombre: string }) => x.nombre),
  };
  return (col: string, v: unknown) => {
    if (v === null || v === undefined) return '';
    if (nombres[col]) return nombres[col]!.get(String(v)) ?? String(v);
    if (col === 'created_at' || col === 'hora_gps' || col === 'validado_en' || col === 'inicio' || col === 'fin') {
      return formatearFechaHora(Number(v));
    }
    if (typeof v === 'object') return JSON.stringify(v);
    return v as string | number | boolean;
  };
}

const OMITIR = new Set(['id', 'updated_at', 'server_updated_at', 'deleted_at', 'finca_id', 'uri_local']);

export default async function rutasRegistros(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const params = z.object({ tabla: z.string() });

  app.get(
    '/',
    { preHandler: app.autenticarUsuario, schema: { tags: ['registros'], summary: 'Tablas disponibles' } },
    async (req) =>
      Object.entries(TABLAS_REGISTROS)
        .filter(([, p]) => !p || tienePermiso(req.usuario!.permisos, p))
        .map(([tabla]) => ({ tabla, etiqueta: REGISTRO_TABLAS[tabla as NombreTabla].meta.etiqueta })),
  );

  app.get(
    '/:tabla',
    {
      preHandler: app.autenticarUsuario,
      schema: { tags: ['registros'], summary: 'Registros con filtros', params, querystring: esquemaFiltrosRegistros },
    },
    async (req) => {
      const tabla = verificarAcceso(req.usuario!, req.params.tabla);
      return consultarRegistros(app.db, tabla, req.usuario!.fincaId, req.query);
    },
  );

  app.get(
    '/:tabla/exportar',
    {
      preHandler: app.requiere('registros:exportar'),
      schema: {
        tags: ['registros'],
        summary: 'Exporta a Excel (xlsx) o CSV',
        params,
        querystring: esquemaFiltrosRegistros.extend({ formato: z.enum(['xlsx', 'csv']).default('xlsx') }),
      },
    },
    async (req, reply) => {
      const tabla = verificarAcceso(req.usuario!, req.params.tabla);
      const filas = await consultarRegistros(app.db, tabla, req.usuario!.fincaId, {
        ...req.query,
        limite: 5000,
      });
      const catalogos = await cargarCatalogos(app.db, req.usuario!.fincaId);
      const valor = resolver(catalogos);
      const presentes = new Set(Object.keys(filas[0] ?? {}));
      const orden = [
        ...Object.keys(REGISTRO_TABLAS[tabla].columnas),
        'estado_validacion',
        'validado_por',
        'validado_en',
        'motivo_rechazo',
        'lat',
        'lng',
        'precision_gps',
        'hora_gps',
        'created_by',
        'created_at',
        'device_id',
      ];
      const columnas = orden.filter((c) => (presentes.size === 0 || presentes.has(c)) && !OMITIR.has(c));
      const encabezados = columnas.map((c) => ETIQUETAS[c] ?? c.replace(/_/g, ' '));
      const nombre = `${tabla}_${new Date().toISOString().slice(0, 10)}_DEMO`;

      if (req.query.formato === 'csv') {
        const esc = (v: unknown) => {
          const s = String(v ?? '');
          return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lineas = [encabezados.map(esc).join(',')];
        for (const f of filas) lineas.push(columnas.map((c) => esc(valor(c, f[c]))).join(','));
        return reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${nombre}.csv"`)
          .send(`\uFEFF${lineas.join('\n')}`);
      }

      const libro = new ExcelJS.Workbook();
      libro.creator = 'Inversiones Kalo — Kalo Campo (DEMO)';
      const hoja = libro.addWorksheet(REGISTRO_TABLAS[tabla].meta.etiqueta.slice(0, 31));
      hoja.addRow(encabezados.map((e) => e.toUpperCase()));
      hoja.getRow(1).font = { bold: true, name: 'Archivo' };
      hoja.getRow(1).border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };
      for (const f of filas) hoja.addRow(columnas.map((c) => valor(c, f[c])));
      hoja.columns.forEach((c) => (c.width = 18));
      hoja.addRow([]);
      hoja.addRow(['Datos ficticios marcados como DEMO']);
      const buffer = await libro.xlsx.writeBuffer();
      return reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${nombre}.xlsx"`)
        .send(Buffer.from(buffer));
    },
  );
}
