import { Aviso, Titulo } from './ui';

/** Opción de un módulo con ruta y menú listos, pero sin pantalla todavía. */
export function EnPreparacion({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <>
      <Titulo>{titulo}</Titulo>
      <Aviso>En preparación. {detalle}</Aviso>
    </>
  );
}
