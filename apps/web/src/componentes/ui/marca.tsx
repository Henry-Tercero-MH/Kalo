/** Tarjeta, cifra destacada, carga, logo e indicador de modo demo. */
import { type ReactNode } from 'react';
import { Estado } from './estado';
import { Etiqueta } from './texto';

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border border-neutros-n200 bg-neutros-n0 p-4 ${className}`}>{children}</div>
  );
}

export function Cifra({
  etiqueta,
  valor,
  unidad,
}: {
  etiqueta: string;
  valor: ReactNode;
  unidad?: string;
}) {
  return (
    <div>
      <Etiqueta>{etiqueta}</Etiqueta>
      <div className="tabular text-2xl font-extrabold text-neutros-n900">
        {valor}
        {unidad ? (
          <span className="ml-1 text-sm font-normal text-neutros-n500">{unidad}</span>
        ) : null}
      </div>
    </div>
  );
}

export function Cargando() {
  return (
    <p role="status" className="text-sm text-neutros-n500">
      Cargando…
    </p>
  );
}

/** Logo arriba a la izquierda; sin archivo de logo se usa el texto en estilo título. */
export function Logo({ imagen }: { imagen?: boolean }) {
  if (imagen)
    return <img src="/kalo-logo.png" alt="Inversiones Kalo" className="h-8 w-auto max-w-full" />;
  return (
    <span className="text-lg font-extrabold uppercase tracking-wider text-neutros-n900">
      Inversiones Kalo
    </span>
  );
}

/**
 * Etiqueta visible del modo demo (sin API): los datos son DEMO en memoria del servidor y
 * vuelven al estado inicial al reiniciarlo.
 */
export function IndicadorDemo() {
  return (
    <span
      className="inline-flex border border-estados-alerta bg-neutros-n50 px-1.5 py-0.5"
      title="Datos de demostración en memoria del servidor, sin API. Los cambios se pierden al reiniciar el servidor. Para usar la API real inicie el panel con KALO_DATOS=api."
    >
      <Estado tipo="alerta" texto="Datos demo (sin API)" />
    </span>
  );
}
