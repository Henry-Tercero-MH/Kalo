'use client';

import { formatearFecha, formatearFechaHora, formatearNumero, SINTOMAS_FUSARIUM, ESTADOS_FUSARIUM } from '@kalo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArchivosRegistro } from '@/componentes/Archivos';
import { Aviso, Cargando, Estado, Tarjeta, Titulo, type TipoEstado } from '@/componentes/ui';
import { api } from '@/lib/api';
import { useNombres } from '@/lib/catalogos';

interface Alerta {
  id: string;
  lote_id: string | null;
  fecha: string;
  sintomas: string[];
  estado: string;
  notas: string | null;
  lat: number | null;
  lng: number | null;
  precision_gps: number | null;
  created_by: string | null;
  created_at: number;
}

const TIPO: Record<string, TipoEstado> = { sospecha: 'peligro', en_revision: 'alerta', descartada: 'neutro', confirmada: 'peligro' };
const TEXTO: Record<string, string> = { sospecha: 'Sospecha', en_revision: 'En revisión', descartada: 'Descartada', confirmada: 'Confirmada' };

export default function Alertas() {
  const n = useNombres();
  const cliente = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['alertas'], queryFn: () => api<Alerta[]>('/alertas'), refetchInterval: 30_000 });
  const cambiar = useMutation({
    mutationFn: (v: { id: string; estado: string }) => api(`/alertas/${v.id}`, { method: 'PATCH', body: { estado: v.estado } }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['alertas'] }),
  });
  const abiertas = data?.filter((a) => a.estado === 'sospecha' || a.estado === 'en_revision').length ?? 0;
  return (
    <>
      <Titulo>Alertas de Fusarium</Titulo>
      <Aviso tipo={abiertas ? 'peligro' : 'exito'}>{abiertas ? `${abiertas} alertas abiertas requieren revisión en campo.` : 'Sin alertas abiertas.'}</Aviso>
      {isLoading ? <Cargando /> : null}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {data?.map((a) => (
          <Tarjeta key={a.id}>
            <div className="flex items-center justify-between">
              <p className="font-extrabold uppercase text-neutros-n900">{n.lotes.get(String(a.lote_id)) ?? 'Sin lote'}</p>
              <Estado tipo={TIPO[a.estado] ?? 'neutro'} texto={TEXTO[a.estado] ?? a.estado} />
            </div>
            <p className="text-sm text-neutros-n500">
              {formatearFecha(a.fecha)} · {n.usuarios.get(String(a.created_by)) ?? '—'} · {formatearFechaHora(a.created_at)}
            </p>
            <ul className="my-2 list-inside list-disc text-sm">
              {a.sintomas.map((s) => (
                <li key={s}>{SINTOMAS_FUSARIUM.find((x) => x.codigo === s)?.etiqueta ?? s}</li>
              ))}
            </ul>
            {a.lat !== null ? (
              <p className="tabular text-xs text-neutros-n500">
                GPS {formatearNumero(a.lat, 5)}, {formatearNumero(a.lng, 5)} (±{formatearNumero(a.precision_gps)} m)
              </p>
            ) : null}
            {a.notas ? <p className="text-sm">{a.notas}</p> : null}
            <div className="my-2">
              <ArchivosRegistro tabla="alertas_fusarium" id={a.id} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutros-n500">Cambiar estado</span>
              <select className="min-h-10 border border-marca-negro px-2" value={a.estado} onChange={(e) => cambiar.mutate({ id: a.id, estado: e.target.value })}>
                {ESTADOS_FUSARIUM.map((e) => (
                  <option key={e} value={e}>
                    {TEXTO[e]}
                  </option>
                ))}
              </select>
            </label>
          </Tarjeta>
        ))}
      </div>
    </>
  );
}
