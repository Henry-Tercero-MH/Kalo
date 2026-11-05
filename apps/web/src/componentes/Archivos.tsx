'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, query } from '@/lib/api';

interface Archivo {
  id: string;
  tipo: string;
  mime: string;
  estado_subida: string;
  url: string | null;
}

/** Fotos y notas de voz de un registro (URL prefirmadas de MinIO). */
export function ArchivosRegistro({ tabla, id }: { tabla: string; id: string }) {
  const [abierto, setAbierto] = useState(false);
  const { data } = useQuery({
    queryKey: ['archivos', tabla, id],
    queryFn: () => api<Archivo[]>(`/archivos${query({ registro_tabla: tabla, registro_id: id })}`),
    enabled: abierto,
  });
  if (!abierto) {
    return (
      <button
        type="button"
        className="inline-flex min-h-10 items-center text-xs font-semibold uppercase tracking-wider underline underline-offset-2 hover:text-neutros-n900"
        onClick={() => setAbierto(true)}
      >
        Ver archivos
      </button>
    );
  }
  if (!data)
    return (
      <span role="status" className="text-xs text-neutros-n500">
        Cargando…
      </span>
    );
  if (data.length === 0) return <span className="text-xs text-neutros-n500">Sin archivos</span>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {data.map((a) =>
        !a.url ? (
          <span key={a.id} className="text-xs text-neutros-n500">
            {a.tipo} en cola
          </span>
        ) : a.tipo === 'foto' ? (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir foto de campo en una pestaña nueva"
            className="inline-block hover:opacity-90"
          >
            <img src={a.url} alt="" className="h-16 w-16 border border-neutros-n200 object-cover" />
          </a>
        ) : (
          <audio key={a.id} controls src={a.url} aria-label="Nota de voz" className="h-10" />
        ),
      )}
    </div>
  );
}
