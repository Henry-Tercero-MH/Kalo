import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pantalla } from '@/componentes/Pantalla';
import { Titulo } from '@/componentes/Texto';
import { FilaMenu } from '@/componentes/Visuales';
import { useRequierePermiso } from '@/modulos/comun';

export default function Labores() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('labores:crear');
  return (
    <Pantalla volver>
      <Titulo>{t('labores.titulo')}</Titulo>
      <FilaMenu
        icono="users"
        titulo={t('labores.asistencia')}
        onPress={() => router.push('/modulos/labores/asistencia')}
      />
      <FilaMenu
        icono="clipboard-list"
        titulo={t('labores.labor')}
        onPress={() => router.push('/modulos/labores/labor')}
      />
    </Pantalla>
  );
}
