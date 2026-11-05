'use client';

/**
 * Tabla de registros por módulo con filtros (fecha, lote, usuario, validación)
 * y exportación a Excel y CSV.
 */
import { REGISTRO_TABLAS, type NombreTabla } from '@kalo/shared';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Icono } from '@/componentes/Icono';
import { Tabla } from '@/componentes/Tabla';
import { Aviso, Boton, Cargando, Titulo } from '@/componentes/ui';
import { api, query } from '@/lib/api';
import { useColumnasRegistro, type Fila } from './_componentes/columnas';
import { Filtros, filtrosIniciales } from './_componentes/Filtros';

export default function TablaRegistros() {
  const { tabla } = useParams<{ tabla: string }>();
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const def = REGISTRO_TABLAS[tabla as NombreTabla];
  const critica = Boolean((def?.meta as { critica?: boolean } | undefined)?.critica);
  const q = query(filtros);
  const { data, error, isLoading } = useQuery({
    queryKey: ['registros', tabla, q],
    queryFn: () => api<Fila[]>(`/registros/${tabla}${q}`),
    enabled: Boolean(def),
  });
  const columnas = useColumnasRegistro(tabla, critica);

  if (!def) return <Aviso tipo="peligro">Tabla desconocida.</Aviso>;
  const exportar = (formato: 'xlsx' | 'csv') => {
    window.location.href = `/api/v1/registros/${tabla}/exportar${query({ ...filtros, formato })}`;
  };

  return (
    <>
      <Titulo
        accion={
          <div className="flex gap-2">
            <Boton
              variante="secundario"
              aria-label="Exportar a Excel"
              onClick={() => exportar('xlsx')}
            >
              <Icono nombre="download" tamano={16} /> Excel
            </Boton>
            <Boton
              variante="secundario"
              aria-label="Exportar a CSV"
              onClick={() => exportar('csv')}
            >
              <Icono nombre="download" tamano={16} /> CSV
            </Boton>
          </div>
        }
      >
        {def.meta.etiqueta}
      </Titulo>
      <Filtros
        valores={filtros}
        onCambio={(cambio) => setFiltros((f) => ({ ...f, ...cambio }))}
        conLote={'lote_id' in def.columnas}
        conValidacion={critica}
      />
      {error ? <Aviso tipo="peligro">{(error as Error).message}</Aviso> : null}
      {isLoading ? <Cargando /> : <Tabla datos={data ?? []} columnas={columnas} />}
    </>
  );
}
