'use client';

/**
 * Bandeja del supervisor: registros críticos pendientes (cosecha, labores, alertas)
 * y conflictos de sincronización entre celulares.
 */
import { TABLAS_CONGELADAS, type NombreTabla } from '@kalo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Aviso, Cargando, Subtitulo, Titulo } from '@/componentes/ui';
import { api } from '@/lib/api';
import { GrupoPendientes } from './_componentes/GrupoPendientes';
import { TarjetaConflicto } from './_componentes/TarjetaConflicto';
import type { Conflicto, Decision, Fila } from './_componentes/tipos';

export default function Validacion() {
  const cliente = useQueryClient();
  const pendientes = useQuery({
    queryKey: ['pendientes'],
    queryFn: () => api<Record<string, Fila[]>>('/validacion/pendientes'),
    refetchInterval: 30_000,
  });
  const conflictos = useQuery({
    queryKey: ['conflictos'],
    queryFn: () => api<Conflicto[]>('/validacion/conflictos'),
    refetchInterval: 30_000,
  });
  // Solo tablas de módulos activos en la etapa actual.
  const visible = (tabla: string) => !TABLAS_CONGELADAS.has(tabla as NombreTabla);
  const listaConflictos = (conflictos.data ?? []).filter((c) => visible(c.tabla));
  const listaPendientes = Object.entries(pendientes.data ?? {}).filter(([t]) => visible(t));
  const [elecciones, setElecciones] = useState<Record<string, Record<string, unknown>>>({});

  const validar = useMutation({
    mutationFn: (v: Decision) =>
      api(`/validacion/${v.tabla}/${v.id}`, {
        method: 'POST',
        body: { decision: v.decision, motivo: v.motivo },
      }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['pendientes'] }),
  });
  const resolver = useMutation({
    mutationFn: (v: { id: string; valores: Record<string, unknown> }) =>
      api(`/validacion/conflictos/${v.id}/resolver`, {
        method: 'POST',
        body: { valores: v.valores },
      }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['conflictos'] }),
  });

  return (
    <>
      <Titulo>Validación</Titulo>
      {validar.error ? <Aviso tipo="peligro">{(validar.error as Error).message}</Aviso> : null}

      <Subtitulo>Conflictos de sincronización ({listaConflictos.length})</Subtitulo>
      <p className="mb-3 text-sm">
        Dos dispositivos editaron el mismo registro sin conexión. Se aplicó el cambio más reciente
        campo por campo; confirme o corrija el valor final.
      </p>
      {conflictos.isLoading ? <Cargando /> : null}
      {conflictos.data && listaConflictos.length === 0 ? (
        <p className="text-sm text-neutros-n500">Sin conflictos pendientes.</p>
      ) : null}
      <div className="flex flex-col gap-3">
        {listaConflictos.map((c) => (
          <TarjetaConflicto
            key={c.id}
            conflicto={c}
            elegidos={elecciones[c.id] ?? {}}
            onElegir={(campo, valor) =>
              setElecciones((e) => ({ ...e, [c.id]: { ...e[c.id], [campo]: valor } }))
            }
            onConfirmar={(valores) => resolver.mutate({ id: c.id, valores })}
            enviando={resolver.isPending}
          />
        ))}
      </div>

      {listaPendientes.map(([tabla, filas]) => (
        <GrupoPendientes
          key={tabla}
          tabla={tabla}
          filas={filas}
          onDecidir={(d) => validar.mutate(d)}
          onDecidirEsperando={(d) => validar.mutateAsync(d)}
          enviando={validar.isPending}
        />
      ))}
    </>
  );
}
