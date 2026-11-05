'use client';

import { formatearFecha, MODULOS } from '@kalo/shared';
import { useQuery } from '@tanstack/react-query';
import { Tabla, type Columna } from '@/componentes/Tabla';
import { Estado, Subtitulo, Titulo } from '@/componentes/ui';
import { api } from '@/lib/api';
import { useNombres } from '@/lib/catalogos';
import { FormularioOrden } from './_componentes/FormularioOrden';

interface Orden {
  id: string;
  titulo: string;
  modulo: string;
  lote_id: string | null;
  asignado_a: string;
  fecha: string;
  estado: string;
}

const TEXTO: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export default function Ordenes() {
  const n = useNombres();
  const { data } = useQuery({
    queryKey: ['ordenes'],
    queryFn: () => api<Orden[]>('/ordenes'),
    refetchInterval: 30_000,
  });
  const columnas: Columna<Orden>[] = [
    {
      header: 'Fecha',
      accessorKey: 'fecha',
      cell: ({ getValue }) => formatearFecha(String(getValue())),
    },
    { header: 'Orden', accessorKey: 'titulo' },
    {
      header: 'Módulo',
      accessorKey: 'modulo',
      cell: ({ getValue }) =>
        MODULOS.find((m) => m.codigo === getValue())?.nombre ?? String(getValue()),
    },
    {
      header: 'Lote',
      accessorKey: 'lote_id',
      cell: ({ getValue }) => n.lotes.get(String(getValue())) ?? '—',
    },
    {
      header: 'Asignado a',
      accessorKey: 'asignado_a',
      cell: ({ getValue }) => n.usuarios.get(String(getValue())) ?? '—',
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ getValue }) => {
        const e = String(getValue());
        return (
          <Estado
            tipo={
              e === 'completada'
                ? 'exito'
                : e === 'en_progreso'
                  ? 'info'
                  : e === 'cancelada'
                    ? 'neutro'
                    : 'alerta'
            }
            texto={TEXTO[e] ?? e}
          />
        );
      },
    },
  ];
  return (
    <>
      <Titulo>Órdenes de trabajo</Titulo>
      <FormularioOrden />
      <Subtitulo>Órdenes</Subtitulo>
      <Tabla datos={data ?? []} columnas={columnas} />
    </>
  );
}
