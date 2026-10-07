/**
 * Inicio del administrador: estado de este teléfono, lo que hay configurado en la finca
 * (usuarios por rol, personal, lotes, cuadrillas) y accesos a indicadores, registro y
 * sincronización. La administración completa (usuarios, roles, catálogos) está en el panel.
 */
import { formatearFechaHora, formatearNumero } from '@kalo/shared';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarrasHorizontales, FilaIndicadores, Indicador } from '@/componentes/Graficas';
import { Pantalla } from '@/componentes/Pantalla';
import { ListaAcciones, TarjetaAccion } from '@/componentes/TarjetaAccion';
import { Subtitulo, Titulo } from '@/componentes/Texto';
import { Aviso, Dato, Tarjeta } from '@/componentes/Visuales';
import { CONFIG } from '@/config';
import { useConsulta } from '@/db/hooks';
import { useSesion } from '@/permisos/sesion';
import { useEstadoSync } from '@/sync/estado';

export function InicioAdministrador() {
  const { t } = useTranslation();
  const router = useRouter();
  const usuario = useSesion((s) => s.usuario);
  const sync = useEstadoSync();
  const usuarios = useConsulta('usuarios');
  const roles = useConsulta('roles');
  const trabajadores = useConsulta('trabajadores');
  const lotes = useConsulta('lotes');
  const cuadrillas = useConsulta('cuadrillas');

  const r = useMemo(() => {
    const activos = usuarios.filter((u) => u.activo);
    const porRol = roles
      .map((rol) => ({
        etiqueta: rol.nombre,
        valor: activos.filter((u) => u.rol_id === rol.id).length,
      }))
      .filter((x) => x.valor > 0);
    return {
      usuarios: activos.length,
      porRol,
      trabajadores: trabajadores.filter((x) => x.activo).length,
      hectareas: lotes.reduce((s, l) => s + l.hectareas, 0),
      lotes: lotes.length,
      cuadrillas: cuadrillas.length,
    };
  }, [usuarios, roles, trabajadores, lotes, cuadrillas]);

  return (
    <Pantalla>
      <Titulo>{t('inicio.hola', { nombre: usuario?.nombre.split(' ')[0] ?? '' })}</Titulo>

      <FilaIndicadores>
        <Indicador etiqueta={t('admin.usuarios')} valor={r.usuarios} />
        <Indicador etiqueta={t('admin.trabajadores')} valor={r.trabajadores} />
        <Indicador
          etiqueta={t('admin.lotes', { n: r.lotes })}
          valor={r.hectareas}
          unidad="ha"
          decimales={1}
        />
        <Indicador etiqueta={t('admin.cuadrillas')} valor={r.cuadrillas} />
      </FilaIndicadores>

      <ListaAcciones>
        <TarjetaAccion
          icono="chart-column"
          titulo={t('supervision.indicadores')}
          estado={t('supervision.indicadoresDesc')}
          onPress={() => router.push('/modulos/indicadores')}
        />
        <TarjetaAccion
          icono="square-plus"
          titulo={t('admin.registrar')}
          estado={t('admin.registrarDesc')}
          onPress={() => router.push('/(tabs)/registrar')}
        />
        <TarjetaAccion
          icono="refresh-cw"
          titulo={t('admin.sincronizacion')}
          estado={
            sync.pendientes > 0
              ? t('caporal.enviarPendientes', { n: sync.pendientes })
              : t('caporal.enviarAlDia')
          }
          destacada={sync.pendientes > 0}
          onPress={() => router.push('/(tabs)/sincronizar')}
        />
      </ListaAcciones>

      <Subtitulo>{t('admin.esteTelefono')}</Subtitulo>
      <Tarjeta>
        <Dato
          etiqueta={t('admin.ultimoEnvio')}
          valor={sync.ultimoEnvio ? formatearFechaHora(sync.ultimoEnvio) : t('caporal.nunca')}
        />
        <Dato
          etiqueta={t('admin.pendientes')}
          valor={`${formatearNumero(sync.pendientes)} · ${t('admin.fotos', { n: sync.archivosPendientes })}`}
        />
        <Dato etiqueta={t('admin.version')} valor={CONFIG.versionApp} />
      </Tarjeta>

      <BarrasHorizontales titulo={t('admin.usuariosPorRol')} filas={r.porRol} />
      <Aviso texto={t('admin.panel')} />
    </Pantalla>
  );
}
