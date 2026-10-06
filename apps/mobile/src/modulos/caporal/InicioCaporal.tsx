/**
 * Inicio del caporal: cuatro tareas grandes del día —tomar asistencia, asignar labor,
 * reportar labor y enviar datos— con el estado de cada una a la vista.
 */
import { fechaIso, formatearFecha, tienePermiso } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Icono, type NombreIcono } from '@/componentes/Icono';
import { Pantalla } from '@/componentes/Pantalla';
import { Titulo } from '@/componentes/Texto';
import { MuestraColor } from '@/componentes/Visuales';
import { campo, espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { useSesion } from '@/permisos/sesion';
import { useEstadoSync } from '@/sync/estado';
import { refrescarContadores } from '@/sync/motor';
import { useSemanaActual } from '@/utils/semana';

function Opcion({
  icono,
  titulo,
  estado,
  destacada,
  onPress,
}: {
  icono: NombreIcono;
  titulo: string;
  estado: string;
  destacada?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${estado}`}
      style={({ pressed }) => [
        estilos.opcion,
        destacada && estilos.opcionDestacada,
        pressed && { backgroundColor: semantico.fondoSuave },
      ]}
    >
      <View style={[estilos.icono, destacada && { backgroundColor: semantico.acento }]}>
        <Icono nombre={icono} tamano={28} color={destacada ? semantico.titulo : semantico.fondo} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={estilos.tituloOpcion}>{titulo}</Text>
        <Text style={estilosBase.secundario}>{estado}</Text>
      </View>
      <Icono nombre="chevron-right" color={semantico.textoSecundario} />
    </Pressable>
  );
}

export function InicioCaporal() {
  const { t } = useTranslation();
  const router = useRouter();
  const { usuario, permisos } = useSesion();
  const pendientes = useEstadoSync((s) => s.pendientes);
  const { numero, color } = useSemanaActual();
  const hoy = fechaIso();

  const todas = useConsulta('cuadrillas');
  const misCuadrillas = useMemo(
    () => todas.filter((c) => c.caporal_id === usuario?.id),
    [todas, usuario?.id],
  );
  const asistencia = useConsulta('asistencia', [Q.where('fecha', hoy)], [hoy]);
  const asignaciones = useConsulta('asignaciones_labor', [Q.where('fecha', hoy)], [hoy]);

  useEffect(() => {
    void refrescarContadores();
  }, [asistencia.length, asignaciones.length]);

  const presentes = asistencia.filter((a) => a.presente).length;
  const porReportar = asignaciones.filter((a) => a.estado === 'asignada').length;
  const reportadas = asignaciones.filter((a) => a.estado === 'reportada').length;
  const primerNombre = usuario?.nombre.split(' ')[0] ?? '';

  return (
    <Pantalla>
      <Titulo>{t('inicio.hola', { nombre: primerNombre })}</Titulo>
      <View style={estilos.resumen}>
        <View style={{ flex: 1 }}>
          <Text style={estilosBase.etiqueta}>{formatearFecha(hoy)}</Text>
          <Text style={estilos.cuadrillas} numberOfLines={2}>
            {misCuadrillas.length > 0
              ? misCuadrillas.map((c) => c.nombre).join(' · ')
              : t('caporal.cuadrillas')}
          </Text>
        </View>
        {color ? (
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={estilosBase.etiqueta}>{t('inicio.semana', { n: numero })}</Text>
            <MuestraColor hex={color.hex} nombre={color.nombre} />
          </View>
        ) : null}
      </View>

      <View style={estilos.lista}>
        <Opcion
          icono="users"
          titulo={t('caporal.asistencia')}
          estado={
            asistencia.length > 0
              ? t('caporal.asistenciaTomada', { presentes, total: asistencia.length })
              : t('caporal.asistenciaPendiente')
          }
          onPress={() => router.push('/modulos/labores/asistencia')}
        />
        <Opcion
          icono="clipboard-list"
          titulo={t('caporal.asignar')}
          estado={
            asignaciones.length > 0
              ? t('caporal.asignarDesc', { n: asignaciones.length })
              : t('caporal.asignarVacio')
          }
          onPress={() => router.push('/modulos/caporal/asignar')}
        />
        <Opcion
          icono="list-checks"
          titulo={t('caporal.reportar')}
          estado={t('caporal.reportarDesc', { pendientes: porReportar, reportadas })}
          onPress={() => router.push('/modulos/caporal/reportar')}
        />
        <Opcion
          icono="cloud-upload"
          titulo={t('caporal.enviar')}
          estado={
            pendientes > 0
              ? t('caporal.enviarPendientes', { n: pendientes })
              : t('caporal.enviarAlDia')
          }
          destacada={pendientes > 0}
          onPress={() => router.push('/modulos/caporal/enviar')}
        />
      </View>

      {tienePermiso(permisos, 'fusarium:crear') ? (
        <View style={{ marginTop: espaciado.xl }}>
          <Text style={[estilosBase.etiqueta, { marginBottom: espaciado.sm }]}>
            {t('caporal.otrasOpciones')}
          </Text>
          <Boton
            titulo={t('inicio.alertaFusarium')}
            icono="triangle-alert"
            variante="peligro"
            onPress={() => router.push('/modulos/fusarium')}
            accessibilityHint={t('inicio.alertaFusariumAyuda')}
          />
        </View>
      ) : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    marginTop: espaciado.sm,
    marginBottom: espaciado.lg,
  },
  cuadrillas: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.cuerpo,
    color: semantico.titulo,
    marginTop: 2,
  },
  lista: { gap: espaciado.md },
  opcion: {
    minHeight: campo.alturaTactil + 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: semantico.borde,
    backgroundColor: semantico.fondo,
  },
  opcionDestacada: { borderWidth: 2, borderColor: semantico.bordeFuerte },
  icono: {
    width: 56,
    height: 56,
    backgroundColor: semantico.bordeFuerte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloOpcion: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 18,
    color: semantico.titulo,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
});
