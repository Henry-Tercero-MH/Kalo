import { MODULOS } from '@kalo/shared';
import { Aviso, Titulo } from '@/componentes/ui';

export default async function Proximamente({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const m = MODULOS.find((x) => x.codigo === codigo);
  return (
    <>
      <Titulo>{m?.nombre ?? 'Próximamente'}</Titulo>
      <Aviso>Próximamente. Este módulo tiene su estructura y ruta preparadas (ver docs/modulos.md).</Aviso>
    </>
  );
}
