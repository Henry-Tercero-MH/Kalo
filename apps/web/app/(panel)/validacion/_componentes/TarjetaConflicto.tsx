'use client';

import { formatearFechaHora, REGISTRO_TABLAS, type NombreTabla } from '@kalo/shared';
import { Icono } from '@/componentes/Icono';
import { Boton, claseEncabezadoTabla, Estado, Tarjeta } from '@/componentes/ui';
import { useNombres } from '@/lib/catalogos';
import { valorFinal, type Conflicto } from './tipos';

/**
 * Un conflicto de sincronización: por cada campo, el valor del servidor y el del celular para
 * elegir, y el valor final que se guardará al confirmar.
 */
export function TarjetaConflicto({
  conflicto: c,
  elegidos,
  onElegir,
  onConfirmar,
  enviando,
}: {
  conflicto: Conflicto;
  elegidos: Record<string, unknown>;
  onElegir: (campo: string, valor: unknown) => void;
  onConfirmar: (valores: Record<string, unknown>) => void;
  enviando: boolean;
}) {
  const n = useNombres();
  return (
    <Tarjeta>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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
          <tr className="border-b-2 border-marca-negro">
            <th scope="col" className={claseEncabezadoTabla}>
              Campo
            </th>
            <th scope="col" className={`${claseEncabezadoTabla} text-right`}>
              Servidor
            </th>
            <th scope="col" className={`${claseEncabezadoTabla} text-right`}>
              Celular
            </th>
            <th scope="col" className={`${claseEncabezadoTabla} text-right`}>
              Valor final
            </th>
          </tr>
        </thead>
        <tbody>
          {c.datos.campos.map((k) => {
            const final = valorFinal(k, elegidos);
            const opcion = (v: unknown, etiqueta: string) => (
              <button
                type="button"
                aria-pressed={final === v}
                className={`tabular inline-flex min-h-10 items-center gap-1 border-2 px-3 ${final === v ? 'border-marca-negro bg-marca-verde100 font-extrabold text-neutros-n900' : 'border-neutros-n500 hover:border-marca-negro'}`}
                onClick={() => onElegir(k.campo, v)}
                aria-label={`Usar valor del ${etiqueta}: ${String(v ?? '—')}`}
              >
                {final === v ? <Icono nombre="check" tamano={16} /> : null}
                {String(v ?? '—')}
              </button>
            );
            return (
              <tr key={k.campo} className="border-b border-neutros-n200">
                <td className="px-3 py-2">{k.campo.replace(/_/g, ' ')}</td>
                <td className="px-3 py-2 text-right">{opcion(k.valorServidor, 'servidor')}</td>
                <td className="px-3 py-2 text-right">{opcion(k.valorCliente, 'celular')}</td>
                <td className="tabular px-3 py-2 text-right font-extrabold text-neutros-n900">
                  {String(final ?? '—')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3">
        <Boton
          disabled={enviando}
          onClick={() =>
            onConfirmar(
              Object.fromEntries(c.datos.campos.map((k) => [k.campo, valorFinal(k, elegidos)])),
            )
          }
        >
          Confirmar valor final
        </Boton>
      </div>
    </Tarjeta>
  );
}
