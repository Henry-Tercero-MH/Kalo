'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Aviso, claseControlCompacto, Estado, Subtitulo } from '@/componentes/ui';
import { api } from '@/lib/api';
import { useCatalogos } from '@/lib/catalogos';
import { th } from './comun';

export function Parametros() {
  const { data } = useCatalogos();
  const cliente = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const guardar = useMutation({
    mutationFn: (v: { id: string; valor: unknown }) =>
      api(`/admin/parametros/${v.id}`, { method: 'PATCH', body: { valor: v.valor } }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['catalogos'] }),
  });
  return (
    <>
      <Subtitulo>Parámetros</Subtitulo>
      <p className="mb-3 text-sm">
        Umbrales, intervalos de GPS, tamaño de celda de cobertura, factores: nada fijo en el código.
        Valores en JSON.
      </p>
      {error ? <Aviso tipo="peligro">{error}</Aviso> : null}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-marca-negro">
            <th scope="col" className={th}>
              Parámetro
            </th>
            <th scope="col" className={th}>
              Valor
            </th>
            <th scope="col" className={th}>
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {data?.parametros
            .slice()
            .sort((a, b) => a.clave.localeCompare(b.clave))
            .map((p) => (
              <tr key={p.id} className="border-b border-neutros-n200 align-top">
                <td className="px-3 py-2">
                  <code className="font-semibold">{p.clave}</code>
                  <p className="text-neutros-n500">{p.descripcion}</p>
                </td>
                <td className="px-3 py-2">
                  <textarea
                    className={`w-full min-w-64 py-2 font-mono ${claseControlCompacto}`}
                    rows={typeof p.valor === 'object' ? 3 : 1}
                    defaultValue={JSON.stringify(p.valor)}
                    aria-label={`Valor de ${p.clave}`}
                    onBlur={(e) => {
                      try {
                        const valor = JSON.parse(e.target.value);
                        setError(null);
                        if (JSON.stringify(valor) !== JSON.stringify(p.valor))
                          guardar.mutate({ id: p.id, valor });
                      } catch {
                        setError(`JSON inválido en ${p.clave}`);
                      }
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  {p.pendiente ? (
                    <Estado tipo="alerta" texto="Pendiente" />
                  ) : (
                    <Estado tipo="exito" texto="Definido" />
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}
