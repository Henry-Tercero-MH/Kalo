'use client';

import { fechaIso, formatearFecha, MODULOS } from '@kalo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Tabla, type Columna } from '@/componentes/Tabla';
import { Aviso, Boton, Campo, Estado, Selector, Subtitulo, Titulo } from '@/componentes/ui';
import { api } from '@/lib/api';
import { useNombres } from '@/lib/catalogos';

interface Orden {
  id: string;
  titulo: string;
  modulo: string;
  lote_id: string | null;
  asignado_a: string;
  fecha: string;
  estado: string;
}

const TEXTO: Record<string, string> = { pendiente: 'Pendiente', en_progreso: 'En progreso', completada: 'Completada', cancelada: 'Cancelada' };

export default function Ordenes() {
  const n = useNombres();
  const cliente = useQueryClient();
  const { data } = useQuery({ queryKey: ['ordenes'], queryFn: () => api<Orden[]>('/ordenes'), refetchInterval: 30_000 });
  const [form, setForm] = useState({ titulo: '', modulo: 'plagas', lote_id: '', asignado_a: '', fecha: fechaIso(), descripcion: '' });
  const crear = useMutation({
    mutationFn: () => api('/ordenes', { method: 'POST', body: { ...form, lote_id: form.lote_id || null, descripcion: form.descripcion || null } }),
    onSuccess: () => {
      setForm((f) => ({ ...f, titulo: '', descripcion: '' }));
      return cliente.invalidateQueries({ queryKey: ['ordenes'] });
    },
  });
  const columnas: Columna<Orden>[] = [
    { header: 'Fecha', accessorKey: 'fecha', cell: ({ getValue }) => formatearFecha(String(getValue())) },
    { header: 'Orden', accessorKey: 'titulo' },
    { header: 'Módulo', accessorKey: 'modulo', cell: ({ getValue }) => MODULOS.find((m) => m.codigo === getValue())?.nombre ?? String(getValue()) },
    { header: 'Lote', accessorKey: 'lote_id', cell: ({ getValue }) => n.lotes.get(String(getValue())) ?? '—' },
    { header: 'Asignado a', accessorKey: 'asignado_a', cell: ({ getValue }) => n.usuarios.get(String(getValue())) ?? '—' },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ getValue }) => {
        const e = String(getValue());
        return <Estado tipo={e === 'completada' ? 'exito' : e === 'en_progreso' ? 'info' : e === 'cancelada' ? 'neutro' : 'alerta'} texto={TEXTO[e] ?? e} />;
      },
    },
  ];
  return (
    <>
      <Titulo>Órdenes de trabajo</Titulo>
      <Subtitulo>Asignar orden</Subtitulo>
      <div className="mb-4 grid grid-cols-1 items-end gap-3 md:grid-cols-3">
        <Campo etiqueta="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        <Selector etiqueta="Módulo" value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })}>
          {MODULOS.filter((m) => m.plataformas.includes('movil' as never) && m.estado === 'activo' && m.tablas.length).map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.nombre}
            </option>
          ))}
        </Selector>
        <Selector etiqueta="Lote" value={form.lote_id} onChange={(e) => setForm({ ...form, lote_id: e.target.value })}>
          <option value="">Sin lote</option>
          {[...n.lotes.entries()].map(([id, x]) => (
            <option key={id} value={id}>
              {x}
            </option>
          ))}
        </Selector>
        <Selector etiqueta="Asignar a" value={form.asignado_a} onChange={(e) => setForm({ ...form, asignado_a: e.target.value })}>
          <option value="">Elija…</option>
          {[...n.usuarios.entries()].map(([id, x]) => (
            <option key={id} value={id}>
              {x}
            </option>
          ))}
        </Selector>
        <Campo etiqueta="Fecha" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
        <Boton disabled={form.titulo.length < 3 || !form.asignado_a || crear.isPending} onClick={() => crear.mutate()}>
          Asignar
        </Boton>
      </div>
      {crear.error ? <Aviso tipo="peligro">{(crear.error as Error).message}</Aviso> : null}
      <Subtitulo>Órdenes</Subtitulo>
      <Tabla datos={data ?? []} columnas={columnas} />
    </>
  );
}
