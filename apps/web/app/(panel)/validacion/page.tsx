'use client';

/**
 * Bandeja del supervisor: registros críticos pendientes (cosecha, labores, alertas)
 * y conflictos de sincronización entre celulares.
 */
import {
  formatearFecha,
  formatearFechaHora,
  formatearNumero,
  REGISTRO_TABLAS,
  type NombreTabla,
} from '@kalo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArchivosRegistro } from '@/componentes/Archivos';
import {
  Aviso,
  Boton,
  Cargando,
  Estado,
  MuestraColor,
  Subtitulo,
  Tarjeta,
  Titulo,
} from '@/componentes/ui';
import { api } from '@/lib/api';
import { useNombres } from '@/lib/catalogos';

type Fila = Record<string, unknown> & { id: string };

interface Conflicto {
  id: string;
  tabla: string;
  registro_id: string;
  usuario_id: string | null;
  dispositivo_id: string | null;
  created_at: number;
  datos: {
    campos: {
      campo: string;
      valorServidor: unknown;
      valorCliente: unknown;
      ganador: 'servidor' | 'cliente';
    }[];
    resultado: Record<string, unknown>;
  };
}

function Resumen({ tabla, f }: { tabla: string; f: Fila }) {
  const n = useNombres();
  const color = n.colores.get(String(f.color_cinta_id));
  return (
    <div className="text-sm">
      <p className="font-extrabold uppercase text-neutros-n900">
        {n.lotes.get(String(f.lote_id)) ?? 'Sin lote'} · {formatearFecha(String(f.fecha))}
      </p>
      {tabla === 'cosecha' ? (
        <p className="tabular flex items-center gap-3">
          <MuestraColor hex={color?.hex} nombre={color?.nombre} />{' '}
          {formatearNumero(Number(f.racimos_cosechados))} cosechados ·{' '}
          {formatearNumero(Number(f.racimos_perdidos))} perdidos
        </p>
      ) : null}
      {tabla === 'labores' ? (
        <p className="tabular">
          {n.tipos.get(String(f.tipo_labor_id))} ·{' '}
          {n.trabajadores.get(String(f.trabajador_id)) ?? '—'} ·{' '}
          {formatearNumero(Number(f.cantidad), 1)}
        </p>
      ) : null}
      {tabla === 'alertas_fusarium' ? <p>Fusarium: {String(f.estado).toUpperCase()}</p> : null}
      <p className="text-neutros-n500">
        {n.usuarios.get(String(f.created_by)) ?? '—'} · {formatearFechaHora(Number(f.created_at))}
      </p>
    </div>
  );
}

export default function Validacion() {
  const cliente = useQueryClient();
  const n = useNombres();
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
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [elecciones, setElecciones] = useState<Record<string, Record<string, unknown>>>({});

  const validar = useMutation({
    mutationFn: (v: {
      tabla: string;
      id: string;
      decision: 'validado' | 'rechazado';
      motivo?: string;
    }) =>
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

      <Subtitulo>Conflictos de sincronización ({conflictos.data?.length ?? 0})</Subtitulo>
      <p className="mb-3 text-sm">
        Dos dispositivos editaron el mismo registro sin conexión. Se aplicó el cambio más reciente
        campo por campo; confirme o corrija el valor final.
      </p>
      {conflictos.isLoading ? <Cargando /> : null}
      {conflictos.data?.length === 0 ? (
        <p className="text-sm text-neutros-n500">Sin conflictos pendientes.</p>
      ) : null}
      <div className="flex flex-col gap-3">
        {conflictos.data?.map((c) => {
          const elegidos = elecciones[c.id] ?? {};
          return (
            <Tarjeta key={c.id}>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-extrabold uppercase text-neutros-n900">
                  {REGISTRO_TABLAS[c.tabla as NombreTabla]?.meta.etiqueta ?? c.tabla} ·{' '}
                  {n.lotes.get(String(c.datos.resultado.lote_id)) ?? ''}
                </p>
                <Estado tipo="alerta" texto="Conflicto" />
              </div>
              <p className="mb-2 text-xs text-neutros-n500">
                {formatearFechaHora(c.created_at)} · {n.usuarios.get(String(c.usuario_id)) ?? '—'} ·
                dispositivo {String(c.dispositivo_id).slice(0, 8)}
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-marca-negro text-[11px] font-semibold uppercase tracking-[0.14em] text-neutros-n500">
                    <th className="py-1 text-left">Campo</th>
                    <th className="py-1 text-right">Servidor</th>
                    <th className="py-1 text-right">Celular</th>
                    <th className="py-1 text-right">Valor final</th>
                  </tr>
                </thead>
                <tbody>
                  {c.datos.campos.map((k) => {
                    const final =
                      k.campo in elegidos
                        ? elegidos[k.campo]
                        : k.ganador === 'cliente'
                          ? k.valorCliente
                          : k.valorServidor;
                    const opcion = (v: unknown, etiqueta: string) => (
                      <button
                        className={`tabular border px-2 py-1 ${final === v ? 'border-2 border-marca-negro font-extrabold' : 'border-neutros-n200'}`}
                        onClick={() =>
                          setElecciones((e) => ({ ...e, [c.id]: { ...elegidos, [k.campo]: v } }))
                        }
                        aria-label={`Usar valor del ${etiqueta}`}
                      >
                        {String(v ?? '—')}
                      </button>
                    );
                    return (
                      <tr key={k.campo} className="border-b border-neutros-n200">
                        <td className="py-2">{k.campo.replace(/_/g, ' ')}</td>
                        <td className="py-2 text-right">{opcion(k.valorServidor, 'servidor')}</td>
                        <td className="py-2 text-right">{opcion(k.valorCliente, 'celular')}</td>
                        <td className="tabular py-2 text-right font-extrabold text-neutros-n900">
                          {String(final ?? '—')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-3">
                <Boton
                  disabled={resolver.isPending}
                  onClick={() => {
                    const valores = Object.fromEntries(
                      c.datos.campos.map((k) => [
                        k.campo,
                        k.campo in elegidos
                          ? elegidos[k.campo]
                          : k.ganador === 'cliente'
                            ? k.valorCliente
                            : k.valorServidor,
                      ]),
                    );
                    resolver.mutate({ id: c.id, valores });
                  }}
                >
                  Confirmar valor final
                </Boton>
              </div>
            </Tarjeta>
          );
        })}
      </div>

      {Object.entries(pendientes.data ?? {}).map(([tabla, filas]) => (
        <div key={tabla}>
          <Subtitulo>
            {REGISTRO_TABLAS[tabla as NombreTabla]?.meta.etiqueta ?? tabla} pendientes (
            {filas.length})
          </Subtitulo>
          {filas.length > 1 ? (
            <Boton
              variante="secundario"
              disabled={validar.isPending}
              onClick={async () => {
                if (!window.confirm(`¿Validar los ${filas.length} registros pendientes?`)) return;
                for (const f of filas)
                  await validar.mutateAsync({ tabla, id: f.id, decision: 'validado' });
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
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label="Motivo del rechazo"
                    placeholder="Motivo (si rechaza)"
                    className="min-h-10 border border-neutros-n300 px-2 text-sm"
                    value={motivos[f.id] ?? ''}
                    onChange={(e) => setMotivos((m) => ({ ...m, [f.id]: e.target.value }))}
                  />
                  <Boton onClick={() => validar.mutate({ tabla, id: f.id, decision: 'validado' })}>
                    Validar
                  </Boton>
                  <Boton
                    variante="peligro"
                    disabled={!motivos[f.id]}
                    onClick={() =>
                      validar.mutate({
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
      ))}
    </>
  );
}
