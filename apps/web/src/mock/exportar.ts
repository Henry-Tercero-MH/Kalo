/**
 * Exportación a CSV y Excel en modo demo, con el mismo formato que la API
 * (columnas, encabezados y nombres resueltos desde los catálogos).
 */
import 'server-only';
import { REGISTRO_TABLAS, type NombreTabla } from '@kalo/shared';
import type { CatalogosMock, Fila } from './almacen';
import type { RespuestaMock } from './enrutador';

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

/** Las horas se exportan en hora de la finca, como la API (aunque el servidor esté en UTC). */
const formato = new Intl.DateTimeFormat('es-GT', {
  timeZone: process.env.ZONA_HORARIA ?? 'America/Guatemala',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
function fechaHoraFinca(ms: number): string {
  if (!ms) return '—';
  const p = Object.fromEntries(formato.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

const OMITIR = new Set([
  'id',
  'updated_at',
  'server_updated_at',
  'deleted_at',
  'finca_id',
  'uri_local',
]);

function resolver(c: CatalogosMock) {
  const mapa = (xs: Fila[], f: (x: Fila) => string) => new Map(xs.map((x) => [x.id, f(x)]));
  const usuarios = mapa(c.usuarios, (x) => String(x.nombre));
  const nombres: Record<string, Map<string, string>> = {
    lote_id: mapa(c.lotes, (l) => `${l.codigo} ${l.nombre}`),
    plaga_id: mapa(c.plagas, (p) => String(p.nombre)),
    trampa_id: mapa(c.trampas, (t) => String(t.codigo_qr)),
    color_cinta_id: mapa(c.colores, (x) => String(x.nombre)),
    tipo_labor_id: mapa(c.tiposLabor, (x) => String(x.nombre)),
    trabajador_id: mapa(c.trabajadores, (x) => String(x.nombre)),
    cuadrilla_id: mapa(c.cuadrillas, (x) => String(x.nombre)),
    created_by: usuarios,
    validado_por: usuarios,
    asignado_a: usuarios,
    usuario_id: usuarios,
  };
  return (col: string, v: unknown): string | number | boolean => {
    if (v === null || v === undefined) return '';
    if (nombres[col]) return nombres[col]!.get(String(v)) ?? String(v);
    if (['created_at', 'hora_gps', 'validado_en', 'inicio', 'fin'].includes(col))
      return fechaHoraFinca(Number(v));
    if (typeof v === 'object') return JSON.stringify(v);
    return v as string | number | boolean;
  };
}

export async function exportarRegistros(
  tabla: NombreTabla,
  filas: Fila[],
  catalogos: CatalogosMock,
  tipo: 'xlsx' | 'csv',
): Promise<RespuestaMock> {
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
  const columnas = orden.filter(
    (c) => (presentes.size === 0 || presentes.has(c)) && !OMITIR.has(c),
  );
  const encabezados = columnas.map((c) => ETIQUETAS[c] ?? c.replace(/_/g, ' '));
  const nombre = `${tabla}_${new Date().toISOString().slice(0, 10)}_DEMO`;

  if (tipo === 'csv') {
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lineas = [encabezados.map(esc).join(',')];
    for (const f of filas) lineas.push(columnas.map((c) => esc(valor(c, f[c]))).join(','));
    return {
      status: 200,
      bytes: new TextEncoder().encode(`\uFEFF${lineas.join('\n')}`),
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${nombre}.csv"`,
      },
    };
  }

  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Inversiones Kalo — Kalo Campo (DEMO)';
  const hoja = libro.addWorksheet(REGISTRO_TABLAS[tabla].meta.etiqueta.slice(0, 31));
  hoja.addRow(encabezados.map((e) => e.toUpperCase()));
  hoja.getRow(1).font = { bold: true, name: 'Archivo' };
  hoja.getRow(1).border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };
  for (const f of filas) hoja.addRow(columnas.map((c) => valor(c, f[c])));
  hoja.columns.forEach((c) => (c.width = 18));
  hoja.addRow([]);
  hoja.addRow(['Datos ficticios marcados como DEMO (modo demo del panel, sin API)']);
  const buffer = await libro.xlsx.writeBuffer();
  return {
    status: 200,
    bytes: new Uint8Array(buffer as ArrayBuffer),
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${nombre}.xlsx"`,
    },
  };
}
