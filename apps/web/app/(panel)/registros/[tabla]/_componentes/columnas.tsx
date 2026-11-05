'use client';

import {
  columnasDe,
  formatearFecha,
  formatearFechaHora,
  formatearNumero,
  MOTIVOS_AUSENCIA,
  REGISTRO_TABLAS,
  SINTOMAS_FUSARIUM,
  type NombreTabla,
} from '@kalo/shared';
import { useMemo, type ReactNode } from 'react';
import { ArchivosRegistro } from '@/componentes/Archivos';
import type { Columna } from '@/componentes/Tabla';
import { Estado, estadoValidacion, MuestraColor } from '@/componentes/ui';
import { useNombres } from '@/lib/catalogos';

export type Fila = Record<string, unknown> & { id: string };
type Nombres = ReturnType<typeof useNombres>;

const ETIQUETAS: Record<string, string> = {
  lote_id: 'Lote',
  plaga_id: 'Plaga',
  trampa_id: 'Trampa',
  color_cinta_id: 'Cinta',
  tipo_labor_id: 'Labor',
  trabajador_id: 'Trabajador',
  centro_costo: 'Centro de costo',
  motivo_ausencia: 'Motivo de ausencia',
  nota_ausencia: 'Nota de ausencia',
  cuadrilla_id: 'Cuadrilla',
  usuario_id: 'Usuario',
  asignado_a: 'Asignado a',
  asignado_por: 'Asignado por',
  created_by: 'Registrado por',
  estado_validacion: 'Validación',
  hora_gps: 'Hora GPS',
  created_at: 'Hora dispositivo',
  precision_gps: 'Precisión (m)',
};

const OCULTAS = new Set([
  'respuestas',
  'formulario_id',
  'uri_local',
  'clave_s3',
  'orden_trabajo_id',
  'validado_por',
  'validado_en',
  'motivo_rechazo',
  'lat',
  'lng',
]);

const HORAS = ['hora_gps', 'created_at', 'inicio', 'fin', 'hora_entrada'];
const USUARIOS = ['created_by', 'usuario_id', 'asignado_a', 'asignado_por'];

/** Muestra el valor de una celda con nombres, colores, fechas y números legibles. */
function celda(c: string, tipo: string, v: unknown, nombres: Nombres): ReactNode {
  if (v === null || v === undefined || v === '') return '—';
  if (c === 'lote_id') return nombres.lotes.get(String(v)) ?? '—';
  if (c === 'plaga_id') return nombres.plagas.get(String(v)) ?? '—';
  if (c === 'trampa_id') return nombres.trampas.get(String(v)) ?? '—';
  if (c === 'tipo_labor_id') return nombres.tipos.get(String(v)) ?? '—';
  if (c === 'trabajador_id') return nombres.trabajadores.get(String(v)) ?? '—';
  if (c === 'cuadrilla_id') return nombres.cuadrillas.get(String(v)) ?? '—';
  if (USUARIOS.includes(c)) return nombres.usuarios.get(String(v)) ?? '—';
  if (c === 'color_cinta_id') {
    const color = nombres.colores.get(String(v));
    return <MuestraColor hex={color?.hex} nombre={color?.nombre} />;
  }
  if (c === 'motivo_ausencia')
    return MOTIVOS_AUSENCIA[String(v) as keyof typeof MOTIVOS_AUSENCIA] ?? String(v);
  if (c === 'estado_validacion') return <Estado {...estadoValidacion(String(v))} />;
  if (c === 'sintomas') {
    const lista = (Array.isArray(v) ? v : []) as string[];
    return lista
      .map((s) => SINTOMAS_FUSARIUM.find((x) => x.codigo === s)?.etiqueta ?? s)
      .join(', ');
  }
  if (c === 'fecha' || c.startsWith('fecha_')) return formatearFecha(String(v));
  if (HORAS.includes(c)) return formatearFechaHora(Number(v));
  if (tipo === 'booleano') return v ? 'Sí' : 'No';
  if (tipo === 'numero')
    return c === 'anio' || c === 'semana'
      ? String(v)
      : formatearNumero(Number(v), Number.isInteger(v) ? 0 : 1);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Columnas de la tabla de un módulo: las suyas, validación, GPS, autor y archivos. */
export function useColumnasRegistro(tabla: string, critica: boolean): Columna<Fila>[] {
  const nombres = useNombres();
  return useMemo<Columna<Fila>[]>(() => {
    const def = REGISTRO_TABLAS[tabla as NombreTabla];
    if (!def) return [];
    const todas = columnasDe(tabla as NombreTabla);
    const orden = [
      ...Object.keys(def.columnas),
      ...(critica ? ['estado_validacion'] : []),
      'precision_gps',
      'hora_gps',
      'created_by',
      'created_at',
    ].filter((c) => c in todas && !OCULTAS.has(c));
    const cols: Columna<Fila>[] = orden.map((c) => {
      const tipo = todas[c]!.tipo;
      return {
        id: c,
        accessorFn: (f: Fila) => f[c],
        header: ETIQUETAS[c] ?? c.replace(/_/g, ' '),
        meta: { numero: tipo === 'numero' && c !== 'anio' && !HORAS.includes(c) },
        cell: ({ getValue }) => celda(c, tipo, getValue(), nombres),
      };
    });
    cols.push({
      id: 'archivos',
      header: 'Archivos',
      enableSorting: false,
      cell: ({ row }) => <ArchivosRegistro tabla={tabla} id={row.original.id} />,
    });
    return cols;
  }, [tabla, critica, nombres]);
}
