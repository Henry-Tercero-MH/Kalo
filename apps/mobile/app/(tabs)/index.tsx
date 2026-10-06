/**
 * Inicio del día: finca, lote actual detectado por GPS, semana y cinta, tareas asignadas,
 * estado de sincronización y botón visible de Alerta de Fusarium.
 */
import { formatearFecha, ROLES, tienePermiso } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Pantalla } from '@/componentes/Pantalla';
import { Subtitulo, Texto, Titulo } from '@/componentes/Texto';
import { Dato, Estado, FilaMenu, MuestraColor, Tarjeta } from '@/componentes/Visuales';
import { espaciado } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { useLoteActual } from '@/gps/lote-actual';
import { InicioCaporal } from '@/modulos/caporal/InicioCaporal';
import { useConfiguracion } from '@/permisos/contexto';
import { useSesion } from '@/permisos/sesion';
import { useSemanaActual } from '@/utils/semana';

export default function Inicio() {
  const rol = useSesion((s) => s.usuario?.rolCodigo);
  return rol === ROLES.caporal ? <InicioCaporal /> : <InicioGeneral />;
}

function InicioGeneral() {
  const { t } = useTranslation();
  const router = useRouter();
  const { usuario, permisos } = useSesion();
  const config = useConfiguracion();
  const lote = useLoteActual();
  const { numero, color } = useSemanaActual();
  const tareas = useConsulta(
    'ordenes_trabajo',
    [
      Q.where('asignado_a', usuario?.id ?? ''),
      Q.where('estado', Q.oneOf(['pendiente', 'en_progreso'])),
    ],
    [usuario?.id],
  );
  const primerNombre = usuario?.nombre.split(' ')[0] ?? '';

  return (
    <Pantalla>
      <Titulo>{t('inicio.hola', { nombre: primerNombre })}</Titulo>

      {tienePermiso(permisos, 'fusarium:crear') ? (
        <View style={{ marginBottom: espaciado.lg }}>
          <Boton
            titulo={t('inicio.alertaFusarium')}
            icono="triangle-alert"
            variante="peligro"
            onPress={() => router.push('/modulos/fusarium')}
            accessibilityHint={t('inicio.alertaFusariumAyuda')}
          />
        </View>
      ) : null}

      <Tarjeta>
        <Dato etiqueta={t('inicio.finca')} valor={config?.fincaNombre ?? '—'} />
        <Dato etiqueta={t('inicio.loteActual')} valor={lote ? lote.nombre : t('comun.sinLote')} />
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Dato etiqueta={t('inicio.cinta')} valor={t('inicio.semana', { n: numero })} />
          {color ? <MuestraColor hex={color.hex} nombre={color.nombre} grande /> : null}
        </View>
      </Tarjeta>

      <Subtitulo>{t('inicio.tareas')}</Subtitulo>
      {tareas.length === 0 ? <Texto>{t('inicio.sinTareas')}</Texto> : null}
      {tareas.map((o) => (
        <FilaMenu
          key={o.id}
          icono="clipboard-list"
          titulo={o.titulo}
          descripcion={formatearFecha(o.fecha)}
          onPress={() => router.push('/modulos/ordenes')}
          derecha={
            <Estado
              tipo={o.estado === 'en_progreso' ? 'info' : 'alerta'}
              texto={t(`estados.${o.estado}`)}
            />
          }
        />
      ))}
    </Pantalla>
  );
}
