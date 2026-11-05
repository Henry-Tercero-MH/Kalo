'use client';

import { formatearFechaHora } from '@kalo/shared';
import { useQuery } from '@tanstack/react-query';
import { Subtitulo } from '@/componentes/ui';
import { api } from '@/lib/api';
import { useNombres } from '@/lib/catalogos';
import { th } from './comun';

interface EntradaBitacora {
  id: string;
  accion: string;
  tabla: string | null;
  registro_id: string | null;
  usuario_id: string | null;
  dispositivo_id: string | null;
  created_at: number;
}

export function Bitacora() {
  const n = useNombres();
  const { data } = useQuery({
    queryKey: ['admin', 'bitacora'],
    queryFn: () => api<EntradaBitacora[]>('/admin/bitacora?limite=300'),
  });
  return (
    <>
      <Subtitulo>Bitácora</Subtitulo>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-marca-negro">
            <th scope="col" className={th}>
              Hora
            </th>
            <th scope="col" className={th}>
              Acción
            </th>
            <th scope="col" className={th}>
              Tabla
            </th>
            <th scope="col" className={th}>
              Usuario
            </th>
            <th scope="col" className={th}>
              Dispositivo
            </th>
          </tr>
        </thead>
        <tbody>
          {data?.map((b) => (
            <tr key={b.id} className="border-b border-neutros-n200">
              <td className="px-3 py-1 tabular">{formatearFechaHora(b.created_at)}</td>
              <td className="px-3 py-1 font-semibold uppercase">{b.accion.replace(/_/g, ' ')}</td>
              <td className="px-3 py-1">{b.tabla ?? '—'}</td>
              <td className="px-3 py-1">{n.usuarios.get(String(b.usuario_id)) ?? '—'}</td>
              <td className="px-3 py-1 font-mono text-xs">
                {b.dispositivo_id?.slice(0, 8) ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
