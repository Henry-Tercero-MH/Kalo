import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pantalla } from '@/componentes/Pantalla';
import { Titulo } from '@/componentes/Texto';
import { FilaMenu } from '@/componentes/Visuales';
import { useRequierePermiso } from '@/modulos/comun';

export default function Plagas() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('plagas:crear');
  return (
    <Pantalla volver>
      <Titulo>{t('plagas.titulo')}</Titulo>
      <FilaMenu icono="bug" titulo={t('plagas.muestreo')} onPress={() => router.push('/modulos/plagas/muestreo')} />
      <FilaMenu icono="scan-search" titulo={t('plagas.preaviso')} onPress={() => router.push('/modulos/plagas/preaviso')} />
    </Pantalla>
  );
}
