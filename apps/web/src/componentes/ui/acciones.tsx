/** Botón principal, secundario y de peligro. */
import { type ButtonHTMLAttributes } from 'react';

type Variante = 'principal' | 'secundario' | 'peligro';
/** `normal` 40 px (tablas y barras del panel); `grande` 48 px y texto 16 px (formularios sueltos). */
export type Tamano = 'normal' | 'grande';
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
