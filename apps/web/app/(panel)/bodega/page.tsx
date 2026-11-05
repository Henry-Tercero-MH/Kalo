import { MenuModulo } from '@/componentes/MenuModulo';
import { OPCIONES_BODEGA } from './_lib/bodega';

export default function Bodega() {
  return <MenuModulo titulo="Menú Bodega" opciones={OPCIONES_BODEGA} />;
}
