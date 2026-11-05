'use client';

import { REGISTRO_TABLAS, type NombreTabla } from '@kalo/shared';
import { useState } from 'react';
import { ArchivosRegistro } from '@/componentes/Archivos';
import { Boton, Campo, Subtitulo } from '@/componentes/ui';
import { Resumen } from './Resumen';
import type { Decision, Fila } from './tipos';

/** Registros pendientes de una tabla, cada uno con Validar y Rechazar (con motivo). */
export function GrupoPendientes({
  tabla,
  filas,
  onDecidir,
  onDecidirEsperando,
  enviando,
}: {
  tabla: string;
  filas: Fila[];
  /** Decide un registro; el error se muestra arriba en la página. */
  onDecidir: (d: Decision) => void;
  /** Igual, pero espera la respuesta: «Validar todos» se detiene en el primer error. */
  onDecidirEsperando: (d: Decision) => Promise<unknown>;
  enviando: boolean;
}) {
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  return (
    <div>
      <Subtitulo>
        {REGISTRO_TABLAS[tabla as NombreTabla]?.meta.etiqueta ?? tabla} pendientes ({filas.length})
      </Subtitulo>
      {filas.length > 1 ? (
        <Boton
          className="mb-2"
          variante="secundario"
          disabled={enviando}
          onClick={async () => {
            if (!window.confirm(`¿Validar los ${filas.length} registros pendientes?`)) return;
            for (const f of filas)
              await onDecidirEsperando({ tabla, id: f.id, decision: 'validado' });
          }}
        >
          Validar todos
        </Boton>
      ) : null}
      {filas.length === 0 ? <p className="text-sm text-neutros-n500">Nada pendiente.</p> : null}
      <div className="flex flex-col">
        {filas.map((f) => (
          <div
            key={f.id}
            className="grid grid-cols-1 items-start gap-3 border-b border-neutros-n200 py-3 lg:grid-cols-[1fr_auto]"
          >
            <div>
              <Resumen tabla={tabla} f={f} />
              <ArchivosRegistro tabla={tabla} id={f.id} />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Campo
                etiqueta="Motivo (obligatorio para rechazar)"
                placeholder="Ej.: cantidad no coincide"
                value={motivos[f.id] ?? ''}
                onChange={(e) => setMotivos((m) => ({ ...m, [f.id]: e.target.value }))}
              />
              <Boton onClick={() => onDecidir({ tabla, id: f.id, decision: 'validado' })}>
                Validar
              </Boton>
              <Boton
                variante="peligro"
                disabled={!motivos[f.id]}
                onClick={() =>
                  onDecidir({
                    tabla,
                    id: f.id,
                    decision: 'rechazado',
                    motivo: motivos[f.id],
                  })
                }
              >
                Rechazar
              </Boton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
