/**
 * Inicio del técnico de sanidad: sus cuatro tareas (muestreo de plagas, preaviso de sigatoka,
 * lectura de trampas y alerta de Fusarium) con el avance de la semana, los lotes que faltan y
 * la incidencia por lote.
 */
import { claveSemana, fechaIso, inicioSemanaIso, semanaIso } from '@kalo/shared';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Barras, BarrasHorizontales } from '@/componentes/Graficas';
import { Pantalla } from '@/componentes/Pantalla';
import { ListaAcciones, TarjetaAccion } from '@/componentes/TarjetaAccion';
import { Subtitulo, Titulo } from '@/componentes/Texto';
import { MuestraColor } from '@/componentes/Visuales';
import { colores, espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { etiquetaSemana, ultimasSemanas, useResumenGerencia } from '@/modulos/gerencia/datos';
import { useSesion } from '@/permisos/sesion';
import { useSemanaActual } from '@/utils/semana';

export function InicioTecnico() {
  const { t } = useTranslation();
  const router = useRouter();
  const usuario = useSesion((s) => s.usuario);
  const { numero, color } = useSemanaActual();
  const lotes = useConsulta('lotes');
  const muestreos = useConsulta('muestreos');
  const preavisos = useConsulta('preaviso_sigatoka');
  const trampas = useConsulta('trampas');
  const lecturas = useConsulta('lecturas_trampa');
  const alertas = useConsulta('alertas_fusarium');
  const { incidencia } = useResumenGerencia();

  const s = useMemo(() => {
    const actual = semanaIso(new Date());
    const inicio = fechaIso(inicioSemanaIso(actual.anio, actual.numero));
    const muestreados = new Set(muestreos.filter((m) => m.fecha >= inicio).map((m) => m.lote_id));
    const conPreaviso = new Set(
      preavisos
        .filter((p) => p.anio === actual.anio && p.semana === actual.numero)
        .map((p) => p.lote_id),
    );
    const delaSemana = lecturas.filter((l) => l.fecha >= inicio);
    const activas = trampas.filter((x) => x.activa);
    const leidas = new Set(delaSemana.map((l) => l.trampa_id));
    const capturasPorSemana = new Map<string, number>();
    for (const l of lecturas) {
      const k = claveSemana(semanaIso(new Date(`${l.fecha}T12:00:00`)));
      capturasPorSemana.set(k, (capturasPorSemana.get(k) ?? 0) + l.cantidad);
    }
    const todas = ultimasSemanas();
    // Sin las primeras semanas vacías (el teléfono guarda pocas semanas de historial).
    const primera = todas.findIndex((x) => (capturasPorSemana.get(claveSemana(x)) ?? 0) > 0);
    const semanas = todas.slice(Math.max(0, Math.min(primera < 0 ? 0 : primera, todas.length - 4)));
    return {
      lotesOrdenados: [...lotes].sort((a, b) => a.codigo.localeCompare(b.codigo)),
      muestreados,
      conPreaviso,
      trampasActivas: activas.length,
      trampasLeidas: activas.filter((x) => leidas.has(x.id)).length,
      capturas: delaSemana.reduce((n, l) => n + l.cantidad, 0),
      abiertas: alertas.filter((a) => ['sospecha', 'en_revision'].includes(a.estado)).length,
      semanas,
      capturasSerie: semanas.map((x) => [capturasPorSemana.get(claveSemana(x)) ?? 0]),
    };
  }, [lotes, muestreos, preavisos, trampas, lecturas, alertas]);

  const total = s.lotesOrdenados.length;
  return (
    <Pantalla>
      <Titulo>{t('inicio.hola', { nombre: usuario?.nombre.split(' ')[0] ?? '' })}</Titulo>
      <View style={estilos.cabecera}>
        <Text style={estilosBase.etiqueta}>{t('sanidad.semana', { n: numero })}</Text>
        {color ? <MuestraColor hex={color.hex} nombre={color.nombre} /> : null}
      </View>

      <ListaAcciones>
        <TarjetaAccion
          icono="bug"
          titulo={t('sanidad.muestreo')}
          estado={t('sanidad.lotesHechos', { n: s.muestreados.size, total })}
          destacada={s.muestreados.size < total}
          onPress={() => router.push('/modulos/plagas/muestreo')}
        />
        <TarjetaAccion
          icono="scan-search"
          titulo={t('sanidad.preaviso')}
          estado={t('sanidad.lotesHechos', { n: s.conPreaviso.size, total })}
          destacada={s.conPreaviso.size < total}
          onPress={() => router.push('/modulos/plagas/preaviso')}
        />
        <TarjetaAccion
          icono="scan-qr-code"
          titulo={t('sanidad.trampas')}
          estado={t('sanidad.trampasEstado', {
            n: s.trampasLeidas,
            total: s.trampasActivas,
            capturas: s.capturas,
          })}
          destacada={s.trampasLeidas < s.trampasActivas}
          onPress={() => router.push('/modulos/trampas')}
        />
        <TarjetaAccion
          icono="triangle-alert"
          titulo={t('inicio.alertaFusarium')}
          estado={
            s.abiertas > 0
              ? t('sanidad.alertasAbiertas', { n: s.abiertas })
              : t('sanidad.sinAlertas')
          }
          peligro={s.abiertas > 0}
          onPress={() => router.push('/modulos/fusarium')}
        />
      </ListaAcciones>

      <Subtitulo>{t('sanidad.pendientesSemana')}</Subtitulo>
      <View style={estilos.tablaLotes}>
        <View style={[estilos.filaLote, estilos.encabezadoLotes]}>
          <Text style={[estilos.celdaLote, estilos.textoEncabezado]}>{t('sanidad.lote')}</Text>
          <Text style={[estilos.celda, estilos.textoEncabezado]}>{t('sanidad.muestreoCorto')}</Text>
          <Text style={[estilos.celda, estilos.textoEncabezado]}>{t('sanidad.preavisoCorto')}</Text>
        </View>
        {s.lotesOrdenados.map((l) => (
          <View key={l.id} style={estilos.filaLote}>
            <Text style={estilos.celdaLote}>{l.nombre}</Text>
            <Marca hecho={s.muestreados.has(l.id)} />
            <Marca hecho={s.conPreaviso.has(l.id)} />
          </View>
        ))}
      </View>

      <BarrasHorizontales
        titulo={t('gerencia.graficaIncidencia')}
        subtitulo={t('gerencia.incidenciaAyuda')}
        filas={incidencia}
        maximo={100}
        decimales={1}
        sufijo="%"
        umbral={20}
      />
      <Barras
        titulo={t('sanidad.graficaCapturas')}
        subtitulo={t('sanidad.ultimasSemanas', { n: s.semanas.length })}
        categorias={s.semanas.map(etiquetaSemana)}
        series={[{ nombre: t('sanidad.capturas'), color: colores.graficas.serie1 }]}
        valores={s.capturasSerie}
      />
    </Pantalla>
  );
}

function Marca({ hecho }: { hecho: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={estilos.celda}>
      <View
        style={[
          estilos.marca,
          {
            backgroundColor: hecho ? semantico.exito : semantico.fondo,
            borderColor: hecho ? semantico.exito : semantico.alerta,
          },
        ]}
      />
      <Text style={[estilosBase.secundario, { color: hecho ? semantico.titulo : semantico.texto }]}>
        {hecho ? t('sanidad.hecho') : t('sanidad.falta')}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espaciado.md,
  },
  tablaLotes: { borderWidth: 1, borderColor: semantico.borde, marginBottom: espaciado.md },
  encabezadoLotes: { backgroundColor: semantico.bordeFuerte },
  textoEncabezado: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: semantico.fondo,
  },
  filaLote: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.md,
    borderTopWidth: 1,
    borderTopColor: semantico.borde,
  },
  celdaLote: {
    flex: 1.3,
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: 14,
    color: semantico.titulo,
  },
  celda: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  marca: { width: 14, height: 14, borderWidth: 2 },
});
