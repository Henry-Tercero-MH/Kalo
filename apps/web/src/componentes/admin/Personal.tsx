'use client';

/**
 * Personal por caporal: cada caporal tiene a su cargo un grupo de trabajadores, que es lo
 * que ve en la app (asistencia y asignación de labores). Aquí se elige el caporal de cada
 * trabajador; el cambio llega a los celulares en la siguiente sincronización.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Aviso, Subtitulo, Tarjeta } from '@/componentes/ui';
import { api } from '@/lib/api';

interface Personal {
  caporales: { id: string; nombre: string }[];
  cuadrillas: { id: string; nombre: string; caporal_id: string | null }[];
  trabajadores: {
    id: string;
    codigo: string;
    nombre: string;
    centro_costo: string | null;
    cuadrilla_id: string | null;
    activo: boolean;
  }[];
}

export function PersonalPorCaporal() {
  const cliente = useQueryClient();
  const { data, error } = useQuery({
    queryKey: ['admin', 'personal'],
    queryFn: () => api<Personal>('/admin/personal'),
  });
  const asignar = useMutation({
    mutationFn: (v: { trabajadorId: string; caporalId: string | null }) =>
      api(`/admin/trabajadores/${v.trabajadorId}/caporal`, {
        method: 'PUT',
        body: { caporal_id: v.caporalId },
      }),
    onSuccess: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: ['admin', 'personal'] }),
        cliente.invalidateQueries({ queryKey: ['catalogos'] }),
      ]),
  });

  if (error) return <Aviso tipo="peligro">{String(error)}</Aviso>;
  if (!data) return null;

  const caporalDeCuadrilla = new Map(data.cuadrillas.map((c) => [c.id, c.caporal_id]));
  const caporalDe = (t: Personal['trabajadores'][number]) =>
    t.cuadrilla_id ? (caporalDeCuadrilla.get(t.cuadrilla_id) ?? null) : null;
  const grupos = [
    ...data.caporales.map((c) => ({ id: c.id as string | null, nombre: c.nombre })),
    { id: null, nombre: 'Sin caporal asignado' },
  ].map((g) => ({ ...g, trabajadores: data.trabajadores.filter((t) => caporalDe(t) === g.id) }));

  return (
    <div className="space-y-4">
      <Aviso>
        Cada caporal ve en la app solo a su personal (asistencia y labores). Cambie el caporal de un
        trabajador con la lista de la derecha; el celular lo recibe al sincronizar.
      </Aviso>
      <div className="grid gap-4 lg:grid-cols-2">
        {grupos.map((g) => (
          <Tarjeta key={g.id ?? 'sin'}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <Subtitulo>{g.nombre}</Subtitulo>
              <span className="text-sm text-neutros-n500">
                {g.trabajadores.length} trabajadores
              </span>
            </div>
            {g.trabajadores.length === 0 ? (
              <p className="text-sm text-neutros-n500">Sin personal.</p>
            ) : (
              <ul className="divide-y divide-neutros-n200">
                {g.trabajadores.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-14 bg-marca-negro px-1.5 py-0.5 text-center text-xs font-bold text-white">
                      {t.codigo}
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold">{t.nombre}</span>
                      <span className="block text-xs text-neutros-n500">
                        {t.centro_costo ?? 'Sin centro de costo'}
                      </span>
                    </span>
                    <select
                      className="border border-neutros-n300 px-2 py-1 text-sm"
                      value={g.id ?? ''}
                      disabled={asignar.isPending}
                      onChange={(e) =>
                        asignar.mutate({ trabajadorId: t.id, caporalId: e.target.value || null })
                      }
                      aria-label={`Caporal a cargo de ${t.nombre}`}
                    >
                      {data.caporales.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                      <option value="">Sin caporal</option>
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}
