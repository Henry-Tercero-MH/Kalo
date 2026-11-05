/** Campos de entrada y selectores con etiqueta, ayuda, error y foco visibles. */
import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { type Tamano } from './acciones';
import { Etiqueta } from './texto';

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
