'use client';

import { Campo, Selector } from '@/componentes/ui';
import { useNombres } from '@/lib/catalogos';

// `type` y no `interface`: `query()` recibe un Record y las interfaces no encajan.
export type ValoresFiltro = {
  desde: string;
  hasta: string;
  lote_id: string;
  usuario_id: string;
  estado_validacion: string;
};

const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);

/** Filtros iniciales: últimos 30 días, sin más filtros. */
export const filtrosIniciales = (): ValoresFiltro => ({
  desde: hace(30),
  hasta: '',
  lote_id: '',
  usuario_id: '',
  estado_validacion: '',
});

/** Fecha, lote (si la tabla tiene lote), usuario y validación (si la tabla es crítica). */
export function Filtros({
  valores,
  onCambio,
  conLote,
  conValidacion,
}: {
  valores: ValoresFiltro;
  onCambio: (cambio: Partial<ValoresFiltro>) => void;
  conLote: boolean;
  conValidacion: boolean;
}) {
  const nombres = useNombres();
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <Campo
        etiqueta="Desde"
        type="date"
        value={valores.desde}
        onChange={(e) => onCambio({ desde: e.target.value })}
      />
      <Campo
        etiqueta="Hasta"
        type="date"
        value={valores.hasta}
        onChange={(e) => onCambio({ hasta: e.target.value })}
      />
      {conLote ? (
        <Selector
          etiqueta="Lote"
          value={valores.lote_id}
          onChange={(e) => onCambio({ lote_id: e.target.value })}
        >
          <option value="">Todos</option>
          {[...nombres.lotes.entries()].map(([id, n]) => (
            <option key={id} value={id}>
              {n}
            </option>
          ))}
        </Selector>
      ) : null}
      <Selector
        etiqueta="Usuario"
        value={valores.usuario_id}
        onChange={(e) => onCambio({ usuario_id: e.target.value })}
      >
        <option value="">Todos</option>
        {[...nombres.usuarios.entries()].map(([id, n]) => (
          <option key={id} value={id}>
            {n}
          </option>
        ))}
      </Selector>
      {conValidacion ? (
        <Selector
          etiqueta="Validación"
          value={valores.estado_validacion}
          onChange={(e) => onCambio({ estado_validacion: e.target.value })}
        >
          <option value="">Todas</option>
          <option value="pendiente">Pendiente</option>
          <option value="validado">Validado</option>
          <option value="rechazado">Rechazado</option>
        </Selector>
      ) : null}
    </div>
  );
}
