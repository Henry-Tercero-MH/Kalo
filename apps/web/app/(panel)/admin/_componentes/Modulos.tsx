'use client';

import { MODULOS } from '@kalo/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BotonEstado, Subtitulo } from '@/componentes/ui';
import { api } from '@/lib/api';
import { useCatalogos } from '@/lib/catalogos';

export function Modulos() {
  const { data } = useCatalogos();
  const cliente = useQueryClient();
  const cambiar = useMutation({
    mutationFn: (v: { codigo: string; activo: boolean }) =>
      api('/admin/feature-flags', { method: 'PUT', body: v }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['catalogos'] }),
  });
  const inactivos = new Set(
    (data?.flags ?? []).filter((f) => !f.activo && !f.rol_id).map((f) => f.codigo),
  );
  return (
    <>
      <Subtitulo>Módulos (feature flags)</Subtitulo>
      <p className="mb-3 text-sm">
        Active o desactive módulos para la finca. Los celulares lo aplican al sincronizar.
      </p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {MODULOS.filter((m) => m.plataformas.length > 0).map((m) => {
          const activo = !inactivos.has(m.codigo);
          return (
            <div
              key={m.codigo}
              className="flex items-center justify-between gap-3 border border-neutros-n200 px-3 py-2"
            >
              <div>
                <p className="font-semibold text-neutros-n900">{m.nombre}</p>
                <p className="text-xs text-neutros-n500">
                  {m.plataformas.join(' · ')} {m.estado === 'proximamente' ? '· Próximamente' : ''}
                </p>
              </div>
              <BotonEstado
                tipo={activo ? 'exito' : 'neutro'}
                texto={activo ? 'Activo' : 'Apagado'}
                aria-label={`${m.nombre}: ${activo ? 'activo' : 'apagado'}. Pulse para ${activo ? 'apagar' : 'activar'}`}
                onClick={() => cambiar.mutate({ codigo: m.codigo, activo: !activo })}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
