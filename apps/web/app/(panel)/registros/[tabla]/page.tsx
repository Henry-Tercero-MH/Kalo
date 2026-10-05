'use client';

/**
 * Tabla de registros por módulo con filtros (fecha, lote, usuario, validación)
 * y exportación a Excel y CSV.
 */
import {
  columnasDe,
  formatearFecha,
  formatearFechaHora,
  formatearNumero,
  REGISTRO_TABLAS,
  SINTOMAS_FUSARIUM,
  type NombreTabla,
} from '@kalo/shared';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArchivosRegistro } from '@/componentes/Archivos';
import { Tabla, type Columna } from '@/componentes/Tabla';
import { Aviso, Boton, Campo, Cargando, Estado, estadoValidacion, MuestraColor, Selector, Titulo } from '@/componentes/ui';
import { api, query } from '@/lib/api';
import { useNombres } from '@/lib/catalogos';

type Fila = Record<string, unknown> & { id: string };

const ETIQUETAS: Record<string, string> = {
  lote_id: 'Lote',
  plaga_id: 'Plaga',
  trampa_id: 'Trampa',
  color_cinta_id: 'Cinta',
  tipo_labor_id: 'Labor',
  trabajador_id: 'Trabajador',
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

const OCULTAS = new Set(['respuestas', 'formulario_id', 'uri_local', 'clave_s3', 'orden_trabajo_id', 'validado_por', 'validado_en', 'motivo_rechazo', 'lat', 'lng']);
const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);

export default function TablaRegistros() {
  const { tabla } = useParams<{ tabla: string }>();
  const nombres = useNombres();
  const [filtros, setFiltros] = useState({ desde: hace(30), hasta: '', lote_id: '', usuario_id: '', estado_validacion: '' });
  const def = REGISTRO_TABLAS[tabla as NombreTabla];
  const critica = Boolean((def?.meta as { critica?: boolean } | undefined)?.critica);
  const q = query(filtros);
  const { data, error, isLoading } = useQuery({ queryKey: ['registros', tabla, q], queryFn: () => api<Fila[]>(`/registros/${tabla}${q}`), enabled: Boolean(def) });

  const columnas = useMemo<Columna<Fila>[]>(() => {
    if (!def) return [];
    const todas = columnasDe(tabla as NombreTabla);
    const orden = [...Object.keys(def.columnas), ...(critica ? ['estado_validacion'] : []), 'precision_gps', 'hora_gps', 'created_by', 'created_at'].filter(
      (c) => c in todas && !OCULTAS.has(c),
    );
    const cols: Columna<Fila>[] = orden.map((c) => {
      const tipo = todas[c]!.tipo;
      return {
        id: c,
        accessorFn: (f: Fila) => f[c],
        header: ETIQUETAS[c] ?? c.replace(/_/g, ' '),
        meta: { numero: tipo === 'numero' && !['anio', 'hora_gps', 'created_at', 'inicio', 'fin', 'hora_entrada'].includes(c) },
        cell: ({ getValue }) => {
          const v = getValue();
          if (v === null || v === undefined || v === '') return '—';
          if (c === 'lote_id') return nombres.lotes.get(String(v)) ?? '—';
          if (c === 'plaga_id') return nombres.plagas.get(String(v)) ?? '—';
          if (c === 'trampa_id') return nombres.trampas.get(String(v)) ?? '—';
          if (c === 'tipo_labor_id') return nombres.tipos.get(String(v)) ?? '—';
          if (c === 'trabajador_id') return nombres.trabajadores.get(String(v)) ?? '—';
          if (c === 'cuadrilla_id') return nombres.cuadrillas.get(String(v)) ?? '—';
          if (['created_by', 'usuario_id', 'asignado_a', 'asignado_por'].includes(c)) return nombres.usuarios.get(String(v)) ?? '—';
          if (c === 'color_cinta_id') {
            const color = nombres.colores.get(String(v));
            return <MuestraColor hex={color?.hex} nombre={color?.nombre} />;
          }
          if (c === 'estado_validacion') return <Estado {...estadoValidacion(String(v))} />;
          if (c === 'sintomas') {
            const lista = (Array.isArray(v) ? v : []) as string[];
            return lista.map((s) => SINTOMAS_FUSARIUM.find((x) => x.codigo === s)?.etiqueta ?? s).join(', ');
          }
          if (c === 'fecha' || c.startsWith('fecha_')) return formatearFecha(String(v));
          if (['hora_gps', 'created_at', 'inicio', 'fin', 'hora_entrada'].includes(c)) return formatearFechaHora(Number(v));
          if (tipo === 'booleano') return v ? 'Sí' : 'No';
          if (tipo === 'numero') return c === 'anio' || c === 'semana' ? String(v) : formatearNumero(Number(v), Number.isInteger(v) ? 0 : 1);
          if (typeof v === 'object') return JSON.stringify(v);
          return String(v);
        },
      };
    });
    cols.push({ id: 'archivos', header: 'Archivos', enableSorting: false, cell: ({ row }) => <ArchivosRegistro tabla={tabla} id={row.original.id} /> });
    return cols;
  }, [def, tabla, critica, nombres]);

  if (!def) return <Aviso tipo="peligro">Tabla desconocida.</Aviso>;
  const exportar = (formato: 'xlsx' | 'csv') => {
    window.location.href = `/api/v1/registros/${tabla}/exportar${query({ ...filtros, formato })}`;
  };

  return (
    <>
      <Titulo
        accion={
          <div className="flex gap-2">
            <Boton variante="secundario" onClick={() => exportar('xlsx')}>
              <Download size={16} aria-hidden /> Excel
            </Boton>
            <Boton variante="secundario" onClick={() => exportar('csv')}>
              <Download size={16} aria-hidden /> CSV
            </Boton>
          </div>
        }
      >
        {def.meta.etiqueta}
      </Titulo>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Campo etiqueta="Desde" type="date" value={filtros.desde} onChange={(e) => setFiltros((f) => ({ ...f, desde: e.target.value }))} />
        <Campo etiqueta="Hasta" type="date" value={filtros.hasta} onChange={(e) => setFiltros((f) => ({ ...f, hasta: e.target.value }))} />
        {'lote_id' in def.columnas ? (
          <Selector etiqueta="Lote" value={filtros.lote_id} onChange={(e) => setFiltros((f) => ({ ...f, lote_id: e.target.value }))}>
            <option value="">Todos</option>
            {[...nombres.lotes.entries()].map(([id, n]) => (
              <option key={id} value={id}>
                {n}
              </option>
            ))}
          </Selector>
        ) : null}
        <Selector etiqueta="Usuario" value={filtros.usuario_id} onChange={(e) => setFiltros((f) => ({ ...f, usuario_id: e.target.value }))}>
          <option value="">Todos</option>
          {[...nombres.usuarios.entries()].map(([id, n]) => (
            <option key={id} value={id}>
              {n}
            </option>
          ))}
        </Selector>
        {critica ? (
          <Selector etiqueta="Validación" value={filtros.estado_validacion} onChange={(e) => setFiltros((f) => ({ ...f, estado_validacion: e.target.value }))}>
            <option value="">Todas</option>
            <option value="pendiente">Pendiente</option>
            <option value="validado">Validado</option>
            <option value="rechazado">Rechazado</option>
          </Selector>
        ) : null}
      </div>
      {error ? <Aviso tipo="peligro">{(error as Error).message}</Aviso> : null}
      {isLoading ? <Cargando /> : <Tabla datos={data ?? []} columnas={columnas} />}
    </>
  );
}
