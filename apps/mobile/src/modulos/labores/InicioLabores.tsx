/**
 * Inicio de la etapa 1 (labores y asistencia) para los roles que no son caporal mientras los
 * tableros están congelados (ver ETAPA en @kalo/shared): asistencia, labores y envío de datos.
 */
import { ETAPA, fechaIso, formatearFecha, tienePermiso } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Pantalla } from '@/componentes/Pantalla';
import { ListaAcciones, TarjetaAccion } from '@/componentes/TarjetaAccion';
import { Titulo } from '@/componentes/Texto';
import { Aviso, Dato, Tarjeta } from '@/componentes/Visuales';
import { espaciado } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { useConfiguracion } from '@/permisos/contexto';
import { useSesion } from '@/permisos/sesion';
import { useEstadoSync } from '@/sync/estado';

export function InicioLabores() {
  const { t } = useTranslation();
  const router = useRouter();
  const { usuario, permisos } = useSesion();
  const config = useConfiguracion();
  const pendientes = useEstadoSync((s) => s.pendientes);
  const hoy = fechaIso();
  const asistencia = useConsulta('asistencia', [Q.where('fecha', hoy)], [hoy]);
  const labores = useConsulta('labores', [Q.where('fecha', hoy)], [hoy]);

  const puedeRegistrar = tienePermiso(permisos, 'labores:crear');
  const presentes = asistencia.filter((a) => a.presente).length;
  const primerNombre = usuario?.nombre.split(' ')[0] ?? '';

  return (
    <Pantalla>
      <Titulo>{t('inicio.hola', { nombre: primerNombre })}</Titulo>
      <Tarjeta>
        <Dato etiqueta={t('inicio.finca')} valor={config?.fincaNombre ?? ETAPA.finca} />
        <Dato etiqueta={t('etapa.hoy')} valor={formatearFecha(hoy)} />
      </Tarjeta>

      <View style={{ marginTop: espaciado.lg }}>
        {puedeRegistrar ? (
          <ListaAcciones>
            <TarjetaAccion
              icono="asistencia"
              titulo={t('labores.asistencia')}
              estado={
                asistencia.length > 0
                  ? t('caporal.asistenciaTomada', { presentes, total: asistencia.length })
                  : t('caporal.asistenciaPendiente')
              }
              onPress={() => router.push('/modulos/labores/asistencia')}
            />
            <TarjetaAccion
              icono="labores"
              titulo={t('labores.labor')}
              estado={t('etapa.laboresHoy', { n: labores.length })}
              onPress={() => router.push('/modulos/labores/labor')}
            />
            <TarjetaAccion
              icono="sincronizar"
              titulo={t('tabs.sincronizar')}
              estado={
                pendientes > 0
                  ? t('caporal.enviarPendientes', { n: pendientes })
                  : t('caporal.enviarAlDia')
              }
              destacada={pendientes > 0}
              onPress={() => router.push('/(tabs)/sincronizar')}
            />
          </ListaAcciones>
        ) : (
          <Aviso texto={t('etapa.sinModulos')} />
        )}
      </View>
    </Pantalla>
  );
}
