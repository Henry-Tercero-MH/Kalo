/**
 * Botón de envío en el encabezado: muestra el estado (color + palabra + registros/fotos en
 * cola) y al tocarlo pregunta «¿Seguro que quiere enviar los datos?». Al confirmar envía lo
 * guardado en el teléfono (los repetidos no se envían) y muestra el resultado.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { resumir, useEstadoSync, type ResumenSync } from '@/sync/estado';
import { refrescarContadores, sincronizar } from '@/sync/motor';
import { leerRed } from '@/sync/red';
import { Boton } from './Boton';
import { Icono } from './Icono';
import { colores, espaciado, estilosBase, semantico, tipografia } from './tema';

const VISUAL: Record<ResumenSync, { color: string; icono: string; clave: string }> = {
  sincronizado: { color: semantico.exito, icono: 'cloud-check', clave: 'sync.sincronizado' },
  pendiente: { color: semantico.alerta, icono: 'cloud-upload', clave: 'sync.enviarBoton' },
  sincronizando: { color: semantico.info, icono: 'refresh-cw', clave: 'sync.sincronizando' },
  error: { color: semantico.peligro, icono: 'cloud-alert', clave: 'sync.error' },
  sinRed: { color: semantico.alerta, icono: 'cloud-off', clave: 'sync.sinRed' },
};

type Paso = 'cerrado' | 'confirmar' | 'enviando' | 'enviado' | 'sinSenal' | 'error';

export function IndicadorSync() {
  const { t } = useTranslation();
  const estado = useEstadoSync();
  const resumen = resumir(estado);
  const v = VISUAL[resumen];
  const cola = estado.pendientes + estado.archivosPendientes;
  const [paso, setPaso] = useState<Paso>('cerrado');
  const [enviados, setEnviados] = useState({ registros: 0, repetidos: 0 });

  const abrir = async () => {
    await refrescarContadores();
    setPaso('confirmar');
  };

  const enviar = async () => {
    const registros = useEstadoSync.getState().pendientes;
    setPaso('enviando');
    const red = await leerRed();
    if (!red.conectado) return setPaso('sinSenal');
    await sincronizar('manual');
    const final = useEstadoSync.getState();
    if (final.ultimoError) return setPaso('error');
    setEnviados({ registros, repetidos: final.duplicadosDescartados });
    setPaso('enviado');
  };

  const conPendientes = cola > 0 && resumen !== 'sincronizando';
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t(v.clave)}${cola ? `, ${cola} en cola` : ''}. ${t('sync.tocarParaEnviar')}`}
        onPress={() => void abrir()}
        hitSlop={6}
        style={({ pressed }) => [
          estilos.boton,
          conPendientes && estilos.botonPendiente,
          pressed && { opacity: 0.7 },
        ]}
      >
        {!conPendientes ? (
          <View style={{ width: 10, height: 10, backgroundColor: v.color }} />
        ) : null}
        <Icono nombre={v.icono} tamano={20} color={semantico.titulo} />
        <Text style={estilos.texto}>
          {t(v.clave)}
          {cola ? ` · ${estado.pendientes}/${estado.archivosPendientes}` : ''}
        </Text>
      </Pressable>

      <Modal
        visible={paso !== 'cerrado'}
        transparent
        animationType="fade"
        onRequestClose={() => paso !== 'enviando' && setPaso('cerrado')}
      >
        <View style={estilos.fondo}>
          <View style={estilos.dialogo} accessibilityViewIsModal>
            <View style={estilos.franja} />
            <View style={estilos.cuerpo}>
              {paso === 'confirmar' ? (
                <>
                  <Text style={estilos.titulo}>{t('sync.confirmarTitulo')}</Text>
                  <Text style={estilosBase.cuerpo}>
                    {estado.pendientes + estado.archivosPendientes > 0
                      ? t('sync.confirmarTexto', {
                          registros: estado.pendientes,
                          fotos: estado.archivosPendientes,
                        })
                      : t('sync.confirmarNada')}
                  </Text>
                  <Text style={[estilosBase.secundario, { marginTop: espaciado.sm }]}>
                    {t('sync.confirmarNota')}
                  </Text>
                  <View style={estilos.botones}>
                    <View style={{ flex: 1 }}>
                      <Boton
                        titulo={t('comun.cancelar')}
                        variante="secundario"
                        onPress={() => setPaso('cerrado')}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Boton titulo={t('sync.siEnviar')} onPress={() => void enviar()} />
                    </View>
                  </View>
                </>
              ) : paso === 'enviando' ? (
                <View style={estilos.centro}>
                  <ActivityIndicator size="large" color={semantico.bordeFuerte} />
                  <Text style={[estilosBase.cuerpo, { marginTop: espaciado.md }]}>
                    {t('sync.enviando')}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={estilos.resultado}>
                    <Icono
                      nombre={paso === 'enviado' ? 'circle-check' : 'triangle-alert'}
                      tamano={32}
                      color={paso === 'enviado' ? semantico.exito : semantico.peligro}
                    />
                    <Text style={[estilos.titulo, { flex: 1, marginBottom: 0 }]}>
                      {paso === 'enviado'
                        ? t('sync.enviadoTitulo')
                        : paso === 'sinSenal'
                          ? t('sync.sinSenalTitulo')
                          : t('sync.errorTitulo')}
                    </Text>
                  </View>
                  <Text style={estilosBase.cuerpo}>
                    {paso === 'enviado'
                      ? t('sync.enviadoTexto', { n: enviados.registros }) +
                        (enviados.repetidos > 0
                          ? ` ${t('caporal.enviadoDuplicados', { n: enviados.repetidos })}`
                          : '')
                      : paso === 'sinSenal'
                        ? t('caporal.sinSenalAviso')
                        : (estado.ultimoError ?? '')}
                  </Text>
                  <View style={{ marginTop: espaciado.lg }}>
                    <Boton titulo={t('comun.aceptar')} onPress={() => setPaso('cerrado')} />
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: espaciado.sm,
    borderWidth: 2,
    borderColor: semantico.bordeFuerte,
    backgroundColor: semantico.fondo,
  },
  botonPendiente: { backgroundColor: semantico.acento },
  texto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 12,
    color: semantico.titulo,
    letterSpacing: 0.8,
  },
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(20, 19, 17, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.lg,
  },
  dialogo: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: semantico.fondo,
    borderWidth: 2,
    borderColor: semantico.bordeFuerte,
  },
  franja: { height: 8, backgroundColor: colores.marca.verde700 },
  cuerpo: { padding: espaciado.lg },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.subtitulo,
    color: semantico.titulo,
    textTransform: 'uppercase',
    marginBottom: espaciado.sm,
  },
  botones: { flexDirection: 'row', gap: espaciado.sm, marginTop: espaciado.lg },
  centro: { alignItems: 'center', paddingVertical: espaciado.lg },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginBottom: espaciado.sm,
  },
});
