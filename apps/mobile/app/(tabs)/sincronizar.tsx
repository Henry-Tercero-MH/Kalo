/**
 * Pantalla de sincronización: registros pendientes, archivos en cola, último envío,
 * botón «Sincronizar ahora», opción «Subir archivos solo con WiFi» y respaldo cifrado.
 */
import { formatearFechaHora, REGISTRO_TABLAS, type NombreTabla } from '@kalo/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Switch, View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Subtitulo, Texto, TextoSecundario, Titulo } from '@/componentes/Texto';
import { Aviso, Dato, Estado, Tarjeta } from '@/componentes/Visuales';
import { espaciado, semantico } from '@/componentes/tema';
import { resumir, useEstadoSync } from '@/sync/estado';
import { refrescarContadores, sincronizar } from '@/sync/motor';
import { exportarRespaldo } from '@/sync/respaldo';
import { almacen } from '@/utils/almacen-seguro';

const TIPO = {
  sincronizado: 'exito',
  pendiente: 'alerta',
  sincronizando: 'info',
  error: 'peligro',
  sinRed: 'alerta',
} as const;

export default function Sincronizar() {
  const { t } = useTranslation();
  const estado = useEstadoSync();
  const resumen = resumir(estado);
  const [soloWifi, setSoloWifi] = useState(false);

  useEffect(() => {
    void refrescarContadores();
    void almacen.preferencias().then((p) => setSoloWifi(p.archivosSoloWifi));
  }, []);

  return (
    <Pantalla>
      <Titulo>{t('sync.titulo')}</Titulo>
      <Tarjeta destacada>
        <Estado tipo={TIPO[resumen]} texto={t(`sync.${resumen}`)} />
        <View style={{ flexDirection: 'row', gap: espaciado.xl, marginTop: espaciado.md }}>
          <Dato etiqueta={t('sync.registrosPendientes')} valor={estado.pendientes} />
          <Dato etiqueta={t('sync.fotosEnCola')} valor={estado.archivosPendientes} />
        </View>
        <Dato
          etiqueta={t('sync.ultimoEnvio')}
          valor={estado.ultimoEnvio ? formatearFechaHora(estado.ultimoEnvio) : t('sync.nunca')}
        />
        {estado.progresoArchivos ? (
          <TextoSecundario>{`${estado.progresoArchivos.actual} / ${estado.progresoArchivos.total}`}</TextoSecundario>
        ) : null}
      </Tarjeta>
      {estado.ultimoError ? <Aviso tipo="peligro" texto={estado.ultimoError} /> : null}
      {estado.rechazados > 0 ? (
        <Aviso tipo="alerta" texto={t('sync.rechazados', { n: estado.rechazados })} />
      ) : null}
      {estado.conflictos > 0 ? (
        <Aviso texto={t('sync.conflictos', { n: estado.conflictos })} />
      ) : null}

      <Boton
        titulo={t('sync.ahora')}
        icono="refresh-cw"
        cargando={estado.fase === 'sincronizando'}
        onPress={() => void sincronizar('manual')}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 56,
          marginTop: espaciado.md,
        }}
      >
        <Texto style={{ flex: 1 }}>{t('sync.soloWifi')}</Texto>
        <Switch
          value={soloWifi}
          trackColor={{ true: semantico.acentoOscuro, false: semantico.borde }}
          onValueChange={async (v) => {
            setSoloWifi(v);
            await almacen.guardarPreferencias({
              ...(await almacen.preferencias()),
              archivosSoloWifi: v,
            });
          }}
          accessibilityLabel={t('sync.soloWifi')}
        />
      </View>

      {Object.keys(estado.pendientesPorTabla).length > 0 ? (
        <>
          <Subtitulo>{t('sync.porTabla')}</Subtitulo>
          {Object.entries(estado.pendientesPorTabla).map(([tabla, n]) => (
            <View
              key={tabla}
              style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}
            >
              <Texto>{REGISTRO_TABLAS[tabla as NombreTabla]?.meta.etiqueta ?? tabla}</Texto>
              <Etiqueta>{String(n)}</Etiqueta>
            </View>
          ))}
        </>
      ) : null}

      <Subtitulo>{t('sync.respaldo')}</Subtitulo>
      <Texto style={{ marginBottom: espaciado.sm }}>{t('sync.respaldoAyuda')}</Texto>
      <Boton
        titulo={t('sync.respaldo')}
        icono="download"
        variante="secundario"
        onPress={async () => {
          try {
            await exportarRespaldo();
          } catch (e) {
            Alert.alert(t('sync.error'), String(e));
          }
        }}
      />
    </Pantalla>
  );
}
