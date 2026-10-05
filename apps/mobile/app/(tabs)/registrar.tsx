/**
 * Menú de registro armado según los permisos del usuario y los feature flags.
 */
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pantalla } from '@/componentes/Pantalla';
import { Texto, Titulo } from '@/componentes/Texto';
import { Estado, FilaMenu } from '@/componentes/Visuales';
import { useModulosMovil } from '@/permisos/sesion';

const OCULTOS = new Set(['perfil', 'archivos', 'sincronizacion']);

export default function Registrar() {
  const { t } = useTranslation();
  const router = useRouter();
  const modulos = useModulosMovil().filter((m) => !OCULTOS.has(m.codigo) && m.rutaMovil);
  return (
    <Pantalla>
      <Titulo>{t('registrar.titulo')}</Titulo>
      {modulos.length === 0 ? <Texto>{t('registrar.sinModulos')}</Texto> : null}
      {modulos.map((m) => (
        <FilaMenu
          key={m.codigo}
          icono={m.icono}
          titulo={m.nombre}
          descripcion={m.descripcion}
          onPress={() => router.push(m.rutaMovil as never)}
          derecha={
            m.estado === 'proximamente' ? (
              <Estado tipo="neutro" texto={t('comun.proximamente')} />
            ) : undefined
          }
        />
      ))}
    </Pantalla>
  );
}
