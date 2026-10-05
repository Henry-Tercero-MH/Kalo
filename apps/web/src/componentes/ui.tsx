/**
 * Componentes base con la guía de marca: títulos en Archivo 800 MAYÚSCULAS con línea
 * negra de 2 pt, botones rectos (principal verde con texto #111111, secundario borde negro),
 * estados con color + palabra, muestras de color de cinta con su nombre.
 */
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';

export function Titulo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b-2 border-marca-negro pb-2">
      <h1 className="text-2xl">{children}</h1>
      {accion}
    </div>
  );
}

export function Subtitulo({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-8 border-b-2 border-marca-negro pb-1 text-base">{children}</h2>;
}

type Variante = 'principal' | 'secundario' | 'peligro';
export function Boton({
  variante = 'principal',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  const estilos: Record<Variante, string> = {
    principal: 'bg-marca-verde text-[#111111] border-2 border-marca-verde',
    secundario: 'bg-neutros-n0 text-neutros-n900 border-2 border-marca-negro',
    peligro: 'bg-neutros-n0 text-estados-peligro border-2 border-estados-peligro',
  };
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 px-4 text-sm font-extrabold uppercase tracking-wide disabled:opacity-40 hover:opacity-90 ${estilos[variante]} ${className}`}
    />
  );
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border border-neutros-n200 bg-neutros-n0 p-4 ${className}`}>{children}</div>
  );
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutros-n500">
      {children}
    </span>
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
      <span aria-hidden className={`inline-block h-2.5 w-2.5 ${COLOR[tipo]}`} />
      {texto}
    </span>
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
        className="inline-block h-4 w-4 border border-marca-negro"
        style={{ background: hex ?? '#ffffff' }}
      />
      <span className="text-sm font-semibold uppercase">{nombre ?? '—'}</span>
    </span>
  );
}

export function Campo({
  etiqueta,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }) {
  return (
    <label className="flex flex-col gap-1">
      <Etiqueta>{etiqueta}</Etiqueta>
      <input
        {...props}
        className={`min-h-10 border border-marca-negro px-3 text-sm text-neutros-n900 ${props.className ?? ''}`}
      />
    </label>
  );
}

export function Selector({
  etiqueta,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string }) {
  return (
    <label className="flex flex-col gap-1">
      <Etiqueta>{etiqueta}</Etiqueta>
      <select
        {...props}
        className="min-h-10 border border-marca-negro bg-neutros-n0 px-3 text-sm text-neutros-n900"
      >
        {children}
      </select>
    </label>
  );
}

export function Aviso({ children, tipo = 'info' }: { children: ReactNode; tipo?: TipoEstado }) {
  const borde: Record<TipoEstado, string> = {
    exito: 'border-estados-exito',
    alerta: 'border-estados-alerta',
    peligro: 'border-estados-peligro',
    info: 'border-estados-info',
    neutro: 'border-neutros-n300',
  };
  return (
    <div className={`my-3 border-l-4 bg-neutros-n50 px-4 py-3 text-sm ${borde[tipo]}`}>
      {children}
    </div>
  );
}

export function Cargando() {
  return <p className="text-sm text-neutros-n500">Cargando…</p>;
}

/** Logo arriba a la izquierda; sin archivo de logo se usa el texto en estilo título. */
export function Logo({ imagen }: { imagen?: boolean }) {
  if (imagen) return <img src="/kalo-logo.png" alt="Inversiones Kalo" className="h-8 w-auto" />;
  return (
    <span className="text-lg font-extrabold uppercase tracking-wider text-neutros-n900">
      Inversiones Kalo
    </span>
  );
}
