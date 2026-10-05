/**
 * Mis tareas: órdenes de trabajo asignadas al usuario. Una tarea iniciada puede grabar ruta.
 */
import { formatearFecha, MODULOS, tienePermiso, type ManifiestoModulo } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Pantalla } from '@/componentes/Pantalla';
import { Texto, TextoSecundario, Titulo } from '@/componentes/Texto';
import { Estado, Tarjeta } from '@/componentes/Visuales';
import { useConsulta } from '@/db/hooks';
import { useRequierePermiso } from '@/modulos/comun';
import { cambiarEstadoOrden } from '@/modulos/ordenes/servicio';
import { useSesion } from '@/permisos/sesion';

export default function Ordenes() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('ordenes:ver');
  const { usuario, permisos } = useSesion();
  const ordenes = useConsulta(
    'ordenes_trabajo',
    [Q.where('asignado_a', usuario?.id ?? ''), Q.sortBy('fecha', Q.desc)],
    [usuario?.id],
  );
  const lotes = useConsulta('lotes');
  const puedeActualizar = tienePermiso(permisos, 'ordenes:actualizar');

  return (
    <Pantalla volver>
      <Titulo>{t('ordenes.titulo')}</Titulo>
      {ordenes.length === 0 ? <Texto>{t('inicio.sinTareas')}</Texto> : null}
      {ordenes.map((o) => {
        const modulo = (MODULOS as readonly ManifiestoModulo[]).find((m) => m.codigo === o.modulo);
        return (
          <Tarjeta key={o.id}>
            <Estado
              tipo={
                o.estado === 'completada'
                  ? 'exito'
                  : o.estado === 'en_progreso'
                    ? 'info'
                    : o.estado === 'cancelada'
                      ? 'neutro'
                      : 'alerta'
              }
              texto={t(`estados.${o.estado}`)}
            />
            <Texto style={{ marginTop: 8, fontWeight: '700' }}>{o.titulo}</Texto>
            <TextoSecundario>
              {formatearFecha(o.fecha)} · {lotes.find((l) => l.id === o.lote_id)?.nombre ?? '—'}
            </TextoSecundario>
            {o.descripcion ? <Texto>{o.descripcion}</Texto> : null}
            {puedeActualizar && o.estado === 'pendiente' ? (
              <View>
                <Boton
                  titulo={t('ordenes.iniciar')}
                  icono="play"
                  onPress={() => void cambiarEstadoOrden(o.id, 'en_progreso')}
                />
              </View>
            ) : null}
            {puedeActualizar && o.estado === 'en_progreso' ? (
              <View>
                {modulo?.rutaMovil ? (
                  <Boton
                    titulo={modulo.nombre}
                    icono={modulo.icono}
                    variante="secundario"
                    onPress={() => router.push(modulo.rutaMovil as never)}
                  />
                ) : null}
                {tienePermiso(permisos, 'rutas:crear') ? (
                  <Boton
                    titulo={t('rutas.iniciar')}
                    icono="route"
                    variante="secundario"
                    onPress={() =>
                      router.push({
                        pathname: '/modulos/rutas',
                        params: { orden: o.id, tarea: o.titulo },
                      })
                    }
                  />
                ) : null}
                <Boton
                  titulo={t('ordenes.completar')}
                  icono="check"
                  onPress={() => void cambiarEstadoOrden(o.id, 'completada')}
                />
              </View>
            ) : null}
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}
