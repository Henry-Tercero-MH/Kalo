/**
 * Inicio del gerente: indicadores de la semana y gráficas de producción, personal y sanidad.
 * Solo consulta (no registra); los datos son los sincronizados en el teléfono.
 */
import { MOTIVOS_AUSENCIA, type MotivoAusencia } from '@kalo/shared';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Barras, BarrasHorizontales, FilaIndicadores, Indicador } from '@/componentes/Graficas';
import { Pantalla } from '@/componentes/Pantalla';
import { Subtitulo, Titulo } from '@/componentes/Texto';
import { MuestraColor } from '@/componentes/Visuales';
import { colores, espaciado, estilosBase } from '@/componentes/tema';
import { useSesion } from '@/permisos/sesion';
import { useSemanaActual } from '@/utils/semana';
import { etiquetaDia, etiquetaSemana, useResumenGerencia } from './datos';

/** Indicadores y gráficas de la finca. Como inicio del gerente o como pantalla aparte. */
export function PanelIndicadores({ volver }: { volver?: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const usuario = useSesion((s) => s.usuario);
  const { color } = useSemanaActual();
  const r = useResumenGerencia();
  const categorias = r.semanas.map(etiquetaSemana);
  const motivos = [...r.asistencia.ausenciasPorMotivo.entries()]
    .map(([codigo, n]) => ({
      etiqueta: MOTIVOS_AUSENCIA[codigo as MotivoAusencia] ?? t('gerencia.sinMotivo'),
      valor: n,
    }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <Pantalla volver={volver}>
      <Titulo>
        {volver
          ? t('gerencia.titulo')
          : t('inicio.hola', { nombre: usuario?.nombre.split(' ')[0] ?? '' })}
      </Titulo>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: espaciado.md,
        }}
      >
        <Text style={estilosBase.etiqueta}>
          {t('gerencia.resumen', { n: r.semanaReferencia.numero })}
        </Text>
        {color ? <MuestraColor hex={color.hex} nombre={color.nombre} /> : null}
      </View>

      <FilaIndicadores>
        <Indicador
          etiqueta={t('gerencia.racimosCosechados')}
          valor={r.cosecha.actual}
          anterior={r.cosecha.anterior}
        />
        <Indicador
          etiqueta={t('gerencia.cajasEstimadas')}
          valor={r.cajas.actual}
          anterior={r.cajas.anterior}
        />
        <Indicador
          etiqueta={t('gerencia.recobro')}
          valor={r.recobro.actual}
          anterior={r.recobro.anterior}
          unidad="%"
          decimales={1}
        />
        <Indicador
          etiqueta={t('gerencia.enfunde')}
          valor={r.enfunde.actual}
          anterior={r.enfunde.anterior}
        />
        <Indicador
          etiqueta={t('gerencia.asistencia')}
          valor={r.asistencia.ultimo}
          anterior={r.asistencia.penultimo}
          unidad="%"
          decimales={0}
        />
        <Indicador
          etiqueta={t('gerencia.alertasFusarium')}
          valor={r.alertasAbiertas}
          nota={r.alertasAbiertas > 0 ? t('gerencia.alertasNota') : t('gerencia.sinAlertas')}
        />
      </FilaIndicadores>

      <Subtitulo>{t('gerencia.produccion')}</Subtitulo>
      <Barras
        titulo={t('gerencia.graficaCosecha')}
        subtitulo={t('gerencia.ultimasSemanas', { n: r.semanas.length })}
        categorias={categorias}
        series={[
          { nombre: t('gerencia.cosechados'), color: colores.graficas.serie1 },
          { nombre: t('gerencia.perdidos'), color: colores.graficas.serie3 },
        ]}
        valores={r.cosecha.serie}
      />
      <Barras
        titulo={t('gerencia.graficaCajas')}
        subtitulo={t('gerencia.cajasAyuda')}
        categorias={categorias}
        series={[{ nombre: t('gerencia.cajas'), color: colores.graficas.serie1 }]}
        valores={r.cajas.serie}
      />
      <Barras
        titulo={t('gerencia.graficaEnfunde')}
        subtitulo={t('gerencia.enfundeAyuda')}
        categorias={categorias}
        series={[{ nombre: t('gerencia.enfunde'), color: colores.graficas.serie1 }]}
        valores={r.enfunde.serie}
      />

      <Subtitulo>{t('gerencia.personal')}</Subtitulo>
      <Barras
        titulo={t('gerencia.graficaAsistencia')}
        subtitulo={t('gerencia.asistenciaAyuda')}
        categorias={r.asistencia.dias.map(etiquetaDia)}
        series={[{ nombre: t('gerencia.asistencia'), color: colores.graficas.serie1 }]}
        valores={r.asistencia.serie}
        sufijo="%"
      />
      {motivos.length > 0 ? (
        <BarrasHorizontales
          titulo={t('gerencia.graficaAusencias')}
          subtitulo={t('gerencia.ausenciasAyuda')}
          filas={motivos}
        />
      ) : null}

      <Subtitulo>{t('gerencia.sanidad')}</Subtitulo>
      <BarrasHorizontales
        titulo={t('gerencia.graficaIncidencia')}
        subtitulo={t('gerencia.incidenciaAyuda')}
        filas={r.incidencia}
        maximo={100}
        decimales={1}
        sufijo="%"
        umbral={20}
      />

      <View style={{ marginTop: espaciado.sm, gap: espaciado.sm }}>
        <Boton
          titulo={t('gerencia.verMapa')}
          icono="map"
          variante="secundario"
          onPress={() => router.push('/(tabs)/mapa')}
        />
      </View>
      <Text style={[estilosBase.secundario, { marginTop: espaciado.md }]}>
        {t('gerencia.nota')}
      </Text>
    </Pantalla>
  );
}

export function InicioGerente() {
  return <PanelIndicadores />;
}
