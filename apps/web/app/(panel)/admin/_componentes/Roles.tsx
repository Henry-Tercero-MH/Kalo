'use client';

/** Matriz de permisos por rol (se guardan en la base; nunca fijos en el código). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Boton, claseEncabezadoTabla, Subtitulo } from '@/componentes/ui';
import { api } from '@/lib/api';

interface RespuestaRoles {
  permisos: { id: string; codigo: string; modulo: string; descripcion: string }[];
  roles: { id: string; codigo: string; nombre: string; permisos: string[] }[];
}

export function Roles() {
  const cliente = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => api<RespuestaRoles>('/admin/roles'),
  });
  const [matriz, setMatriz] = useState<Record<string, Set<string>>>({});
  useEffect(() => {
    if (data) setMatriz(Object.fromEntries(data.roles.map((r) => [r.id, new Set(r.permisos)])));
  }, [data]);
  const guardar = useMutation({
    mutationFn: (rolId: string) =>
      api(`/admin/roles/${rolId}/permisos`, {
        method: 'PUT',
        body: { permisos: [...(matriz[rolId] ?? [])] },
      }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  });
  if (!data) return null;
  return (
    <>
      <Subtitulo>Roles y permisos</Subtitulo>
      <p className="mb-3 text-sm">
        Los cambios llegan a los celulares en la siguiente sincronización.
      </p>
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr className="border-b-2 border-marca-negro">
              <th scope="col" className={claseEncabezadoTabla}>
                Permiso
              </th>
              {data.roles.map((r) => (
                <th key={r.id} scope="col" className={`${claseEncabezadoTabla} text-center`}>
                  {r.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.permisos.map((p) => (
              <tr key={p.id} className="border-b border-neutros-n200">
                <td className="px-3 py-2">
                  <code className="font-semibold">{p.codigo}</code>{' '}
                  <span className="text-neutros-n500">{p.descripcion}</span>
                </td>
                {data.roles.map((r) => (
                  <td key={r.id} className="px-3 py-1 text-center">
                    <input
                      type="checkbox"
                      className="h-5 w-5 cursor-pointer accent-marca-negro align-middle"
                      aria-label={`${r.nombre}: ${p.codigo}`}
                      checked={matriz[r.id]?.has(p.codigo) ?? false}
                      onChange={(e) =>
                        setMatriz((m) => {
                          const s = new Set(m[r.id]);
                          if (e.target.checked) s.add(p.codigo);
                          else s.delete(p.codigo);
                          return { ...m, [r.id]: s };
                        })
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {data.roles.map((r) => (
                <td key={r.id} className="px-3 py-2 text-center">
                  <Boton
                    variante="secundario"
                    aria-label={`Guardar permisos de ${r.nombre}`}
                    onClick={() => guardar.mutate(r.id)}
                  >
                    Guardar
                  </Boton>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
