/**
 * Botón de envío en el encabezado: verde, con el ícono de enviar (avión de papel) y la cantidad
 * de datos en cola; sin señal o con error lleva una marca de color en la esquina. Al tocarlo
 * pregunta «¿Seguro que quiere enviar los datos?», envía lo guardado en el teléfono (los
 * repetidos no se envían) y muestra el resultado.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { resumir, useEstadoSync, type ResumenSync } from '@/sync/estado';
import { refrescarContadores, sincronizar } from '@/sync/motor';
import { leerRed } from '@/sync/red';
import { Boton } from './Boton';
import { Icono } from './Icono';
import { EstadoCarga, EstadoError } from './Visuales';
import { bordes, campo, espaciado, estilosBase, semantico, tamanoIcono, tipografia } from './tema';

const VISUAL: Record<ResumenSync, { color: string; icono: string; clave: string }> = {
  sincronizado: { color: semantico.exito, icono: 'sincronizado', clave: 'sync.sincronizado' },
  pendiente: { color: semantico.alerta, icono: 'sincronizar', clave: 'sync.enviarBoton' },
  sincronizando: { color: semantico.info, icono: 'sincronizando', clave: 'sync.sincronizando' },
  error: { color: semantico.peligro, icono: 'errorEnvio', clave: 'sync.error' },
  sinRed: { color: semantico.alerta, icono: 'sinConexion', clave: 'sync.sinRed' },
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

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('sync.enviarBoton')}. ${t(v.clave)}${cola ? `, ${t('sync.enCola', { n: cola })}` : ''}`}
        onPress={() => void abrir()}
        hitSlop={6}
        style={({ pressed }) => [estilos.boton, pressed && estilos.botonPresionado]}
      >
        {resumen === 'sincronizando' ? (
          <ActivityIndicator size="small" color={semantico.titulo} />
        ) : (
          <Icono nombre="sincronizar" tamano={tamanoIcono.mediano} color={semantico.titulo} />
        )}
        <Text style={estilos.texto} maxFontSizeMultiplier={tipografia.escalaMaxima.controles}>
          {resumen === 'sincronizando' ? t('sync.enviandoCorto') : t('sync.enviarBoton')}
        </Text>
        {/* Cuántos datos esperan envío. */}
        {cola > 0 && resumen !== 'sincronizando' ? (
          <View style={estilos.cantidad}>
            <Text
              style={estilos.cantidadTexto}
              maxFontSizeMultiplier={tipografia.escalaMaxima.controles}
            >
              {cola > 99 ? '99+' : cola}
            </Text>
          </View>
        ) : null}
        {/* Sin señal o con error: marca en la esquina con el color del estado. */}
        {resumen === 'sinRed' || resumen === 'error' ? (
          <View style={[estilos.marcaEstado, { backgroundColor: v.color }]} />
        ) : null}
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
                <EstadoCarga
                  titulo={estado.progresoArchivos ? t('sync.subiendoArchivos') : t('sync.enviando')}
                  actual={estado.progresoArchivos?.actual}
                  total={estado.progresoArchivos?.total}
                />
              ) : paso === 'sinSenal' || paso === 'error' ? (
                <>
                  <EstadoError
                    titulo={paso === 'sinSenal' ? t('sync.sinSenalTitulo') : t('sync.errorTitulo')}
                    descripcion={
                      paso === 'sinSenal' ? t('caporal.sinSenalAviso') : (estado.ultimoError ?? '')
                    }
                    accion={{
                      titulo: t('comun.reintentar'),
                      icono: 'sincronizar',
                      onPress: () => void enviar(),
                    }}
                  />
                  <Boton
                    titulo={t('comun.cerrar')}
                    variante="secundario"
                    onPress={() => setPaso('cerrado')}
                  />
                </>
              ) : (
                <>
                  <View style={estilos.resultado}>
                    <Icono nombre="exito" tamano={tamanoIcono.enorme} color={semantico.exito} />
                    <Text style={[estilos.titulo, { flex: 1, marginBottom: 0 }]}>
                      {t('sync.enviadoTitulo')}
                    </Text>
                  </View>
                  <Text style={estilosBase.cuerpo}>
                    {t('sync.enviadoTexto', { n: enviados.registros }) +
                      (enviados.repetidos > 0
                        ? ` ${t('caporal.enviadoDuplicados', { n: enviados.repetidos })}`
                        : '')}
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
    gap: espaciado.sm,
    // 44 pt visibles + hitSlop de 6 = 56 pt tocables sin agrandar el encabezado.
    minHeight: campo.alturaTactil - espaciado.md,
    paddingHorizontal: espaciado.md,
    backgroundColor: semantico.acento,
    borderWidth: bordes.lineaTitulo,
    borderColor: semantico.bordeFuerte,
  },
  botonPresionado: { backgroundColor: semantico.acentoPresionado },
  texto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.pequeno,
    color: semantico.titulo,
    letterSpacing: tipografia.espaciadoLetras.enfasis,
  },
  cantidad: {
    minWidth: espaciado.xl,
    height: espaciado.xl,
    paddingHorizontal: espaciado.xs,
    backgroundColor: semantico.superficieInvertida,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantidadTexto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.etiqueta,
    color: semantico.textoSobreOscuro,
    fontVariant: ['tabular-nums'],
  },
  marcaEstado: {
    position: 'absolute',
    top: -espaciado.xs,
    right: -espaciado.xs,
    width: espaciado.md,
    height: espaciado.md,
    borderWidth: bordes.lineaTitulo,
    borderColor: semantico.fondo,
  },
  fondo: {
    flex: 1,
    backgroundColor: semantico.velo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.lg,
  },
  dialogo: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: semantico.fondo,
    borderWidth: bordes.lineaTitulo,
    borderColor: semantico.bordeFuerte,
  },
  franja: { height: espaciado.sm, backgroundColor: semantico.acentoOscuro },
  cuerpo: { padding: espaciado.lg },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.subtitulo,
    color: semantico.titulo,
    textTransform: 'uppercase',
    marginBottom: espaciado.sm,
  },
  botones: { flexDirection: 'row', gap: espaciado.sm, marginTop: espaciado.lg },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginBottom: espaciado.sm,
  },
});
