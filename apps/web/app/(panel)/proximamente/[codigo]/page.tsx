import { moduloCongelado, MODULOS } from '@kalo/shared';
import { redirect } from 'next/navigation';
import { Aviso, Titulo } from '@/componentes/ui';

export default async function Proximamente({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (moduloCongelado(codigo)) redirect('/');
  const m = MODULOS.find((x) => x.codigo === codigo);
  return (
    <>
      <Titulo>{m?.nombre ?? 'Próximamente'}</Titulo>
      <Aviso>
        Próximamente. Este módulo tiene su estructura y ruta preparadas (ver docs/modulos.md).
      </Aviso>
    </>
  );
}
