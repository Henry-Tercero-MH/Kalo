'use client';

/** Matriz de permisos por rol (se guardan en la base; nunca fijos en el código). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Boton, Subtitulo } from '@/componentes/ui';
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
              <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-neutros-n500">
                Permiso
              </th>
              {data.roles.map((r) => (
                <th
                  key={r.id}
                  className="px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutros-n500"
                >
                  {r.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.permisos.map((p) => (
              <tr key={p.id} className="border-b border-neutros-n200">
                <td className="px-2 py-1">
                  <code className="font-semibold">{p.codigo}</code>{' '}
                  <span className="text-neutros-n500">{p.descripcion}</span>
                </td>
                {data.roles.map((r) => (
                  <td key={r.id} className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-black"
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
                <td key={r.id} className="px-2 py-2">
                  <Boton variante="secundario" onClick={() => guardar.mutate(r.id)}>
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
