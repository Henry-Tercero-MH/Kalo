'use client';

import { useState } from 'react';
import { Aviso, Etiqueta, Subtitulo, type TipoEstado } from '@/componentes/ui';
import { api } from '@/lib/api';

/** Carga el respaldo cifrado (.json) que exporta un celular que no logra sincronizar. */
export function ImportarRespaldo() {
  const [mensaje, setMensaje] = useState<{ tipo: TipoEstado; texto: string } | null>(null);
  return (
    <>
      <Subtitulo>Importar respaldo cifrado</Subtitulo>
      <p id="ayuda-respaldo" className="mb-3 text-sm">
        Si un celular nunca logra sincronizar, exporte su respaldo desde la app (Sincronizar →
        Exportar respaldo) y cárguelo aquí.
      </p>
      <div className="flex flex-col gap-1">
        <Etiqueta htmlFor="archivo-respaldo">Archivo de respaldo (.json)</Etiqueta>
        <input
          id="archivo-respaldo"
          type="file"
          accept=".json,application/json"
          aria-describedby="ayuda-respaldo"
          className="text-sm text-neutros-n700 file:mr-3 file:min-h-10 file:cursor-pointer file:border-2 file:border-marca-negro file:bg-neutros-n0 file:px-4 file:text-sm file:font-extrabold file:uppercase file:tracking-wide file:text-neutros-n900 hover:file:bg-neutros-n50"
          onChange={async (e) => {
            const archivo = e.target.files?.[0];
            if (!archivo) return;
            try {
              const contenido = JSON.parse(await archivo.text());
              const r = await api<{ resultados: { estado: string }[] }>('/respaldos/importar', {
                method: 'POST',
                body: contenido,
              });
              const aceptados = r.resultados.filter((x) => x.estado !== 'rechazado').length;
              setMensaje({
                tipo: 'exito',
                texto: `Respaldo importado: ${aceptados} de ${r.resultados.length} registros aceptados.`,
              });
            } catch (err) {
              setMensaje({
                tipo: 'peligro',
                texto: `No se pudo importar: ${(err as Error).message}`,
              });
            }
          }}
        />
      </div>
      {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}
    </>
  );
}
