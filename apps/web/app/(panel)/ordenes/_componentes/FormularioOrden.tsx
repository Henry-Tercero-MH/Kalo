'use client';

import { fechaIso, MODULOS } from '@kalo/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Aviso, Boton, Campo, Selector, Subtitulo } from '@/componentes/ui';
import { api } from '@/lib/api';
import { useNombres } from '@/lib/catalogos';

/** Formulario para asignar una orden de trabajo a un usuario de campo. */
export function FormularioOrden() {
  const n = useNombres();
  const cliente = useQueryClient();
  const [form, setForm] = useState({
    titulo: '',
    modulo: 'plagas',
    lote_id: '',
    asignado_a: '',
    fecha: fechaIso(),
    descripcion: '',
  });
  const crear = useMutation({
    mutationFn: () =>
      api('/ordenes', {
        method: 'POST',
        body: { ...form, lote_id: form.lote_id || null, descripcion: form.descripcion || null },
      }),
    onSuccess: () => {
      setForm((f) => ({ ...f, titulo: '', descripcion: '' }));
      return cliente.invalidateQueries({ queryKey: ['ordenes'] });
    },
  });

  return (
    <>
      <Subtitulo>Asignar orden</Subtitulo>
      <div className="mb-4 grid grid-cols-1 items-start gap-3 md:grid-cols-3">
        <Campo
          etiqueta="Título"
          placeholder="Ej.: Raspado lote 4"
          ayuda="Mínimo 3 letras."
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
        />
        <Selector
          etiqueta="Módulo"
          value={form.modulo}
          onChange={(e) => setForm({ ...form, modulo: e.target.value })}
        >
          {MODULOS.filter(
            (m) =>
              m.plataformas.includes('movil' as never) && m.estado === 'activo' && m.tablas.length,
          ).map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.nombre}
            </option>
          ))}
        </Selector>
        <Selector
          etiqueta="Lote"
          opcional
          value={form.lote_id}
          onChange={(e) => setForm({ ...form, lote_id: e.target.value })}
        >
          <option value="">Sin lote</option>
          {[...n.lotes.entries()].map(([id, x]) => (
            <option key={id} value={id}>
              {x}
            </option>
          ))}
        </Selector>
        <Selector
          etiqueta="Asignar a"
          value={form.asignado_a}
          onChange={(e) => setForm({ ...form, asignado_a: e.target.value })}
        >
          <option value="">Elija…</option>
          {[...n.usuarios.entries()].map(([id, x]) => (
            <option key={id} value={id}>
              {x}
            </option>
          ))}
        </Selector>
        <Campo
          etiqueta="Fecha"
          type="date"
          value={form.fecha}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
        />
        <Boton
          className="md:mt-5"
          disabled={form.titulo.length < 3 || !form.asignado_a || crear.isPending}
          onClick={() => crear.mutate()}
        >
          Asignar
        </Boton>
      </div>
      {crear.error ? <Aviso tipo="peligro">{(crear.error as Error).message}</Aviso> : null}
    </>
  );
}
