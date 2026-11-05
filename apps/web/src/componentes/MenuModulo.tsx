import Link from 'next/link';
import { Icono } from './Icono';

export interface OpcionMenu {
  ruta: string;
  nombre: string;
  icono: string;
  /** `false` = la opción existe pero su pantalla está en preparación. */
  listo: boolean;
}

/**
 * Portada de un módulo: título centrado y sus opciones en una fila de íconos grandes con el
 * nombre debajo. Al pasar el mouse o con el foco de teclado, la opción se vuelve una tarjeta
 * verde claro con borde y sombra suave, y el ícono queda dentro de un círculo verde.
 *
 * Apto para daltonismo: el estado activo no depende solo del verde. El verde nunca lleva
 * texto (1,8:1 sobre blanco); el ícono va en trazo fino gris oscuro (n700, 11:1 sobre blanco)
 * y casi negro sobre el verde (10,5:1), el círculo tiene aro oscuro porque contra el fondo
 * verde claro casi no se distingue (1,7:1), el borde de la
 * tarjeta es verde700 (3,1:1, mínimo para controles) y el nombre se subraya.
 */
export function MenuModulo({
  titulo,
  opciones,
}: {
  titulo: string;
  opciones: readonly OpcionMenu[];
}) {
  return (
    <section aria-labelledby="titulo-menu" className="pt-10 text-center">
      <h1
        id="titulo-menu"
        className="mb-8 border-none p-0 text-2xl font-extrabold normal-case tracking-normal text-neutros-n900"
      >
        {titulo}
      </h1>
      <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-2">
        {opciones.map((o) => (
          <li key={o.ruta}>
            <Link
              href={o.ruta}
              className="group flex w-40 flex-col items-center gap-3 rounded-campo border-2 border-transparent px-3 pb-5 pt-4 text-neutros-n900 outline-offset-2 transition-[background-color,border-color,box-shadow] duration-150 hover:border-marca-verde700 hover:bg-marca-verde50 hover:shadow-[0_6px_16px_rgb(20_19_17/0.12)] focus-visible:border-marca-verde700 focus-visible:bg-marca-verde50 focus-visible:shadow-[0_6px_16px_rgb(20_19_17/0.12)]"
            >
              <span className="flex size-22 items-center justify-center rounded-full border-2 border-transparent text-neutros-n700 transition-colors duration-150 group-hover:border-neutros-n700 group-hover:bg-marca-verde group-hover:text-neutros-n900 group-focus-visible:border-neutros-n700 group-focus-visible:bg-marca-verde group-focus-visible:text-neutros-n900">
                <Icono nombre={o.icono} tamano={48} grosor={1.5} />
              </span>
              <span className="text-base font-semibold leading-snug decoration-2 underline-offset-4 group-hover:underline group-focus-visible:underline">
                {o.nombre}
              </span>
              {o.listo ? null : (
                <span className="-mt-2 text-xs text-neutros-n500">En preparación</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
