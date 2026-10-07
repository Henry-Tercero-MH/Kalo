/**
 * Inicio del supervisor: lo que tiene que revisar (registros por validar, alertas de Fusarium,
 * órdenes abiertas), cómo está el personal hoy por cuadrilla y el avance de las labores.
 * La validación se hace en el panel de oficina; aquí se ve qué espera.
 */
import { fechaIso, formatearFecha } from '@kalo/shared';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { BarrasHorizontales, FilaIndicadores, Indicador } from '@/componentes/Graficas';
import { Pantalla } from '@/componentes/Pantalla';
import { ListaAcciones, TarjetaAccion } from '@/componentes/TarjetaAccion';
import { Subtitulo, Texto, Titulo } from '@/componentes/Texto';
import { Aviso, Estado } from '@/componentes/Visuales';
import { espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { useSesion } from '@/permisos/sesion';

const ESTADOS_ABIERTOS = ['sospecha', 'en_revision'];

export function InicioSupervisor() {
  const { t } = useTranslation();
  const router = useRouter();
  const usuario = useSesion((s) => s.usuario);
  const cosecha = useConsulta('cosecha');
  const labores = useConsulta('labores');
  const alertas = useConsulta('alertas_fusarium');
  const ordenes = useConsulta('ordenes_trabajo');
  const asistencia = useConsulta('asistencia');
  const cuadrillas = useConsulta('cuadrillas');
  const asignaciones = useConsulta('asignaciones_labor');
  const lotes = useConsulta('lotes');

  const r = useMemo(() => {
    const nombreLote = new Map(lotes.map((l) => [l.id, l.nombre]));
    const pendientesCosecha = cosecha.filter((c) => c.estado_validacion === 'pendiente');
    const pendientesLabores = labores.filter((l) => l.estado_validacion === 'pendiente');
    const porValidar = [
      ...pendientesCosecha.map((c) => ({
        id: c.id,
        tipo: t('supervision.cosecha'),
        detalle: `${nombreLote.get(c.lote_id) ?? '—'} · ${c.racimos_cosechados} racimos`,
        fecha: c.fecha,
      })),
      ...pendientesLabores.map((l) => ({
        id: l.id,
        tipo: t('supervision.labor'),
        detalle: `${nombreLote.get(l.lote_id) ?? '—'} · ${l.cantidad}`,
        fecha: l.fecha,
      })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha));

    // Asistencia: el día más reciente con registros (hoy si ya se tomó).
    const ultimoDia = [...new Set(asistencia.map((a) => a.fecha))].sort().at(-1) ?? null;
    const delDia = asistencia.filter((a) => a.fecha === ultimoDia);
    const porCuadrilla = cuadrillas
      .map((c) => {
        const filas = delDia.filter((a) => a.cuadrilla_id === c.id);
        return {
          etiqueta: c.nombre.replace(/\s*DEMO$/i, ''),
          valor: filas.length ? (filas.filter((a) => a.presente).length / filas.length) * 100 : 0,
        };
      })
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
    const presentes = delDia.filter((a) => a.presente).length;

    const hoy = fechaIso();
    const asignadasHoy = asignaciones.filter((a) => a.fecha === hoy && a.estado !== 'cancelada');
    return {
      porValidar,
      alertasAbiertas: alertas
        .filter((a) => ESTADOS_ABIERTOS.includes(a.estado))
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .map((a) => ({ ...a, lote: a.lote_id ? (nombreLote.get(a.lote_id) ?? '—') : '—' })),
      ordenesAbiertas: ordenes.filter((o) => o.estado === 'pendiente' || o.estado === 'en_progreso')
        .length,
      ultimoDia,
      porCuadrilla,
      asistenciaPct: delDia.length ? (presentes / delDia.length) * 100 : null,
      asignadas: asignadasHoy.length,
      reportadas: asignadasHoy.filter((a) => a.estado === 'reportada').length,
    };
  }, [cosecha, labores, alertas, ordenes, asistencia, cuadrillas, asignaciones, lotes, t]);

  return (
    <Pantalla>
      <Titulo>{t('inicio.hola', { nombre: usuario?.nombre.split(' ')[0] ?? '' })}</Titulo>

      <FilaIndicadores>
        <Indicador
          etiqueta={t('supervision.porValidar')}
          valor={r.porValidar.length}
          nota={t('supervision.porValidarNota')}
        />
        <Indicador
          etiqueta={t('gerencia.alertasFusarium')}
          valor={r.alertasAbiertas.length}
          nota={r.alertasAbiertas.length ? t('gerencia.alertasNota') : t('gerencia.sinAlertas')}
        />
        <Indicador
          etiqueta={t('supervision.asistencia')}
          valor={r.asistenciaPct}
          unidad="%"
          nota={r.ultimoDia ? formatearFecha(r.ultimoDia) : undefined}
        />
        <Indicador
          etiqueta={t('supervision.laboresHoy')}
          valor={r.asignadas}
          nota={t('supervision.reportadas', { n: r.reportadas })}
        />
      </FilaIndicadores>

      <ListaAcciones>
        <TarjetaAccion
          icono="chart-column"
          titulo={t('supervision.indicadores')}
          estado={t('supervision.indicadoresDesc')}
          onPress={() => router.push('/modulos/indicadores')}
        />
        <TarjetaAccion
          icono="clipboard-list"
          titulo={t('supervision.ordenes')}
          estado={t('supervision.ordenesDesc', { n: r.ordenesAbiertas })}
          destacada={r.ordenesAbiertas > 0}
          onPress={() => router.push('/modulos/ordenes')}
        />
        <TarjetaAccion
          icono="map"
          titulo={t('supervision.mapa')}
          estado={t('supervision.mapaDesc')}
          onPress={() => router.push('/(tabs)/mapa')}
        />
      </ListaAcciones>

      <Subtitulo>{t('supervision.personal')}</Subtitulo>
      {r.porCuadrilla.length > 0 ? (
        <BarrasHorizontales
          titulo={t('supervision.presentesCuadrilla')}
          subtitulo={r.ultimoDia ? formatearFecha(r.ultimoDia) : undefined}
          filas={r.porCuadrilla}
          maximo={100}
          sufijo="%"
        />
      ) : (
        <Texto>{t('supervision.sinAsistencia')}</Texto>
      )}

      <Subtitulo>{t('supervision.alertas')}</Subtitulo>
      {r.alertasAbiertas.length === 0 ? (
        <Aviso tipo="exito" texto={t('gerencia.sinAlertas')} />
      ) : (
        r.alertasAbiertas.map((a) => (
          <View key={a.id} style={estilos.fila}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.principal}>{a.lote}</Text>
              <Text style={estilosBase.secundario}>{formatearFecha(a.fecha)}</Text>
            </View>
            <Estado tipo="peligro" texto={t(`estadosFusarium.${a.estado}`, a.estado)} />
          </View>
        ))
      )}

      <Subtitulo>{t('supervision.ultimosPorValidar')}</Subtitulo>
      {r.porValidar.length === 0 ? (
        <Aviso tipo="exito" texto={t('supervision.nadaPorValidar')} />
      ) : (
        <>
          {r.porValidar.slice(0, 6).map((v) => (
            <View key={v.id} style={estilos.fila}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.principal}>{v.tipo}</Text>
                <Text style={estilosBase.secundario}>{v.detalle}</Text>
              </View>
              <Text style={estilosBase.secundario}>{formatearFecha(v.fecha)}</Text>
            </View>
          ))}
          <Aviso texto={t('supervision.validarEnPanel')} />
        </>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  fila: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.sm,
    borderBottomWidth: 1,
    borderBottomColor: semantico.borde,
  },
  principal: { fontFamily: tipografia.familias.titulo, fontSize: 15, color: semantico.titulo },
});
