/**
 * Componentes base con la guía de marca: títulos en Archivo 800 MAYÚSCULAS con línea
 * negra de 2 pt, botones rectos (principal verde con texto oscuro, secundario borde negro),
 * estados con color + palabra, muestras de color de cinta con su nombre.
 *
 * Accesibilidad: cada campo tiene <label htmlFor> visible, foco con borde negro de 2 pt
 * (outline sobre el borde), error con borde y mensaje en peligro enlazado por
 * aria-describedby, y alto mínimo de 40 px en botones y controles (panel de oficina).
 */
import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

export function Titulo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-marca-negro pb-2">
      <h1 className="text-2xl">{children}</h1>
      {accion}
    </div>
  );
}

export function Subtitulo({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-8 border-b-2 border-marca-negro pb-1 text-base">{children}</h2>;
}

type Variante = 'principal' | 'secundario' | 'peligro';
/** `normal` 40 px (tablas y barras del panel); `grande` 48 px y texto 16 px (formularios sueltos). */
type Tamano = 'normal' | 'grande';
const ALTO: Record<Tamano, string> = {
  normal: 'min-h-10 px-4 text-sm',
  grande: 'min-h-12 px-6 text-base',
};

export function Boton({
  variante = 'principal',
  tamano = 'normal',
  cargando = false,
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamano?: Tamano;
  /**
   * Acción en curso: deshabilita el botón (sin doble envío) y lo marca aria-busy, pero sin
   * atenuarlo, para que el texto de progreso («Entrando…») se lea con contraste completo.
   */
  cargando?: boolean;
}) {
  const estilos: Record<Variante, string> = {
    principal:
      'bg-marca-verde text-neutros-n900 border-2 border-marca-verde enabled:hover:bg-marca-verde600 enabled:hover:border-marca-verde600',
    secundario:
      'bg-neutros-n0 text-neutros-n900 border-2 border-marca-negro enabled:hover:bg-neutros-n50',
    peligro:
      'bg-neutros-n0 text-estados-peligro border-2 border-estados-peligro enabled:hover:bg-neutros-n50',
  };
  return (
    <button
      {...props}
      disabled={disabled || cargando}
      aria-busy={cargando || props['aria-busy'] || undefined}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap font-extrabold uppercase tracking-wide ${ALTO[tamano]} ${cargando ? 'cursor-wait' : 'disabled:cursor-not-allowed disabled:opacity-40'} ${estilos[variante]} ${className}`}
    />
  );
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border border-neutros-n200 bg-neutros-n0 p-4 ${className}`}>{children}</div>
  );
}

const claseEtiqueta = 'text-xs font-semibold uppercase tracking-[0.12em] text-neutros-n500';

/** Con `htmlFor` se dibuja como <label> asociado al control; sin él, como texto. */
export function Etiqueta({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={claseEtiqueta}>
        {children}
      </label>
    );
  }
  return <span className={claseEtiqueta}>{children}</span>;
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

/**
 * Foco suave de los campos: borde verde oscuro (3,3:1 sobre blanco) con halo verde claro,
 * en lugar del contorno negro general de globals.css.
 */
export const claseFocoCampo =
  'focus-visible:border-marca-verde700 focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-marca-verde100';

/**
 * Estados de un control: normal (borde 1 pt), foco (`claseFocoCampo`), error (borde peligro),
 * deshabilitado (fondo suave, texto secundario).
 */
const claseEstadosControl = `rounded-campo bg-neutros-n0 text-neutros-n900 placeholder:text-neutros-n500 ${claseFocoCampo} disabled:cursor-not-allowed disabled:border-neutros-n300 disabled:bg-neutros-n50 disabled:text-neutros-n500`;

/**
 * Control compacto para editar dentro de una tabla (inputs y selects por fila, que llevan
 * `aria-label` porque el encabezado de la columna hace de label visible).
 */
export const claseControlCompacto = `min-h-10 border border-neutros-n500 px-2 text-sm ${claseEstadosControl}`;

/** Encabezado de columna de tabla: 12 px MAYÚSCULAS, gris secundario. */
export const claseEncabezadoTabla =
  'px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-neutros-n500';

interface PropsCampoBase {
  etiqueta: string;
  /** Mensaje de error bajo el campo; marca el control con aria-invalid. */
  error?: string;
  /** Texto de ayuda bajo el campo (formato, ejemplo, cuándo es obligatorio). */
  ayuda?: string;
  /** Agrega «(opcional)» a la etiqueta. */
  opcional?: boolean;
}

function useCampo(
  id: string | undefined,
  { error, ayuda }: PropsCampoBase,
  describedby: string | undefined,
) {
  const generado = useId();
  const idControl = id ?? generado;
  const idAyuda = ayuda ? `${idControl}-ayuda` : undefined;
  const idError = error ? `${idControl}-error` : undefined;
  const descrito = [describedby, idAyuda, idError].filter(Boolean).join(' ') || undefined;
  return { idControl, idAyuda, idError, descrito };
}

function EncabezadoCampo({
  htmlFor,
  etiqueta,
  opcional,
}: {
  htmlFor: string;
  etiqueta: string;
  opcional?: boolean;
}) {
  return (
    <Etiqueta htmlFor={htmlFor}>
      {etiqueta}
      {opcional ? <span className="normal-case tracking-normal"> (opcional)</span> : null}
    </Etiqueta>
  );
}

function MensajesCampo({
  idAyuda,
  idError,
  ayuda,
  error,
}: {
  idAyuda?: string;
  idError?: string;
  ayuda?: string;
  error?: string;
}) {
  return (
    <>
      {ayuda ? (
        <p id={idAyuda} className="text-xs text-neutros-n500">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={idError} className="text-sm font-semibold text-estados-peligro">
          {error}
        </p>
      ) : null}
    </>
  );
}

export function Campo({
  etiqueta,
  error,
  ayuda,
  opcional,
  tamano = 'normal',
  id,
  className = '',
  'aria-describedby': describedby,
  ...props
}: InputHTMLAttributes<HTMLInputElement> &
  PropsCampoBase & {
    /** `normal` 40 px; `grande` 48 px y texto 16 px (inicio de sesión, formularios sueltos). */
    tamano?: Tamano;
  }) {
  const { idControl, idAyuda, idError, descrito } = useCampo(
    id,
    { etiqueta, error, ayuda },
    describedby,
  );
  const invalido =
    Boolean(error) || props['aria-invalid'] === true || props['aria-invalid'] === 'true';
  const alto = tamano === 'grande' ? 'min-h-12 text-base' : 'min-h-10 text-sm';
  return (
    <div className="flex flex-col gap-1">
      <EncabezadoCampo htmlFor={idControl} etiqueta={etiqueta} opcional={opcional} />
      <input
        {...props}
        id={idControl}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={descrito}
        className={`border px-3 read-only:bg-neutros-n50 ${alto} ${claseEstadosControl} ${invalido ? 'border-estados-peligro' : 'border-marca-negro'} ${className}`}
      />
      <MensajesCampo idAyuda={idAyuda} idError={idError} ayuda={ayuda} error={error} />
    </div>
  );
}

export function Selector({
  etiqueta,
  error,
  ayuda,
  opcional,
  id,
  className = '',
  children,
  'aria-describedby': describedby,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & PropsCampoBase) {
  const { idControl, idAyuda, idError, descrito } = useCampo(
    id,
    { etiqueta, error, ayuda },
    describedby,
  );
  return (
    <div className="flex flex-col gap-1">
      <EncabezadoCampo htmlFor={idControl} etiqueta={etiqueta} opcional={opcional} />
      <select
        {...props}
        id={idControl}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={descrito}
        className={`min-h-10 border px-3 text-sm ${claseEstadosControl} ${error ? 'border-estados-peligro' : 'border-marca-negro'} ${className}`}
      >
        {children}
      </select>
      <MensajesCampo idAyuda={idAyuda} idError={idError} ayuda={ayuda} error={error} />
    </div>
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
