/**
 * Módulos preparados: estructura, ruta y pantalla con aviso «Próximamente».
 */
import { MODULOS } from '@kalo/shared';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pantalla } from '@/componentes/Pantalla';
import { Texto, Titulo } from '@/componentes/Texto';
import { Aviso } from '@/componentes/Visuales';

export default function Proximamente() {
  const { t } = useTranslation();
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const modulo = MODULOS.find((m) => m.codigo === codigo);
  return (
    <Pantalla volver>
      <Titulo>{modulo?.nombre ?? t('comun.proximamente')}</Titulo>
      <Aviso texto={t('comun.proximamente')} />
      {modulo ? <Texto>{modulo.descripcion}</Texto> : null}
    </Pantalla>
  );
}
