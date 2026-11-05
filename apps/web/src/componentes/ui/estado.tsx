/** Estados con color + palabra, muestras de color de cinta y avisos. */
import { type ButtonHTMLAttributes, type ReactNode } from 'react';

export type TipoEstado = 'exito' | 'alerta' | 'peligro' | 'info' | 'neutro';
const COLOR: Record<TipoEstado, string> = {
  exito: 'bg-estados-exito',
  alerta: 'bg-estados-alerta',
  peligro: 'bg-estados-peligro',
  info: 'bg-estados-info',
  neutro: 'bg-neutros-n300',
};

/** El color solo no transmite significado: siempre color + palabra. */
export function Estado({ tipo, texto }: { tipo: TipoEstado; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-extrabold uppercase tracking-wider text-neutros-n900">
      <span aria-hidden className={`inline-block h-2.5 w-2.5 shrink-0 ${COLOR[tipo]}`} />
      {texto}
    </span>
  );
}

/**
 * Botón que muestra un estado y lo alterna al pulsarlo (activo / inactivo). Tiene borde para
 * que se reconozca como control y alto mínimo de 40 px.
 */
export function BotonEstado({
  tipo,
  texto,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tipo: TipoEstado; texto: string }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-10 items-center border border-neutros-n500 bg-neutros-n0 px-3 enabled:hover:border-marca-negro disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      <Estado tipo={tipo} texto={texto} />
    </button>
  );
}

export function estadoValidacion(e: string | null | undefined): {
  tipo: TipoEstado;
  texto: string;
} {
  if (e === 'validado') return { tipo: 'exito', texto: 'Validado' };
  if (e === 'rechazado') return { tipo: 'peligro', texto: 'Rechazado' };
  return { tipo: 'alerta', texto: 'Pendiente' };
}

/** Los colores de cinta son datos: muestra + nombre escrito al lado. */
export function MuestraColor({ hex, nombre }: { hex?: string | null; nombre?: string | null }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block h-4 w-4 shrink-0 border border-marca-negro"
        style={{ background: hex ?? '#ffffff' }}
      />
      <span className="text-sm font-semibold uppercase">{nombre ?? '—'}</span>
    </span>
  );
}

/** Palabra visible del aviso: el color del borde solo no transmite el significado. */
const PALABRA_AVISO: Partial<Record<TipoEstado, string>> = {
  exito: 'Listo',
  alerta: 'Atención',
  peligro: 'Error',
};

/** `id` permite enlazar el aviso a los campos con aria-describedby. */
export function Aviso({
  children,
  tipo = 'info',
  id,
}: {
  children: ReactNode;
  tipo?: TipoEstado;
  id?: string;
}) {
  const borde: Record<TipoEstado, string> = {
    exito: 'border-estados-exito',
    alerta: 'border-estados-alerta',
    peligro: 'border-estados-peligro',
    info: 'border-estados-info',
    neutro: 'border-neutros-n300',
  };
  const palabra = PALABRA_AVISO[tipo];
  return (
    <div
      id={id}
      role={tipo === 'peligro' ? 'alert' : 'status'}
      className={`my-3 border-l-4 bg-neutros-n50 px-4 py-3 text-sm text-neutros-n700 ${borde[tipo]}`}
    >
      {palabra ? (
        <strong className="mr-2 text-xs font-extrabold uppercase tracking-wider text-neutros-n900">
          {palabra}
        </strong>
      ) : null}
      {children}
    </div>
  );
}
