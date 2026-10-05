/**
 * Piezas de formulario reutilizables: selector de lote (propuesto por GPS), captura de
 * fotos, nota de voz y ubicación.
 */
import { formatearNumero, type Fila } from '@kalo/shared';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, View } from 'react-native';
import { esWeb } from '@/demo/entorno';
import { useLoteActual, useLotes } from '@/gps/lote-actual';
import type { Ubicacion } from '@/gps/ubicacion';
import { guardarAudio, tomarFoto, type ArchivoLocal } from '@/utils/archivos';
import { Boton } from './Boton';
import { Opciones } from './Controles';
import { Etiqueta, Texto, TextoSecundario } from './Texto';
import { Aviso, Estado } from './Visuales';
import { espaciado, semantico } from './tema';

/** Selector de lote: propone el lote detectado por GPS; el usuario puede cambiarlo. */
export function SelectorLote({
  valor,
  onCambio,
}: {
  valor: string | null;
  onCambio: (id: string) => void;
}) {
  const { t } = useTranslation();
  const lotes = useLotes();
  const actual = useLoteActual();
  useEffect(() => {
    if (!valor && actual) onCambio(actual.id);
  }, [actual, valor, onCambio]);
  return (
    <View>
      <Etiqueta>{t('comun.elegirLote')}</Etiqueta>
      {actual ? (
        <View style={{ marginVertical: espaciado.sm }}>
          <Estado tipo="exito" texto={`GPS: ${actual.nombre}`} />
        </View>
      ) : (
        <View style={{ marginVertical: espaciado.sm }}>
          <Estado tipo="neutro" texto={t('comun.sinLote')} />
        </View>
      )}
      <Opciones
        columnas={2}
        opciones={lotes.map((l) => ({
          valor: l.id,
          etiqueta: `${l.codigo} · ${formatearNumero(l.hectareas, 1)} ha`,
        }))}
        valor={valor}
        onCambio={(v) => onCambio(v as string)}
      />
    </View>
  );
}

export function nombreLote(lotes: Fila<'lotes'>[], id: string | null) {
  return lotes.find((l) => l.id === id)?.nombre ?? '—';
}

export function CapturaFotos({
  fotos,
  onCambio,
}: {
  fotos: ArchivoLocal[];
  onCambio: (f: ArchivoLocal[]) => void;
}) {
  const { t } = useTranslation();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ marginVertical: espaciado.md }}>
      <Etiqueta>{t('comun.fotos')}</Etiqueta>
      {fotos.length > 0 && (
        <ScrollView horizontal style={{ marginVertical: espaciado.sm }}>
          {fotos.map((f) => (
            <Image
              key={f.uri}
              source={{ uri: f.uri }}
              style={{
                width: 96,
                height: 96,
                marginRight: espaciado.sm,
                borderWidth: 1,
                borderColor: semantico.borde,
              }}
            />
          ))}
        </ScrollView>
      )}
      <Boton
        titulo={t('comun.tomarFoto')}
        icono="camera"
        variante="secundario"
        cargando={cargando}
        onPress={async () => {
          setCargando(true);
          setError(null);
          try {
            const f = await tomarFoto();
            if (f) onCambio([...fotos, f]);
          } catch (e) {
            console.warn('No se pudo tomar la foto', e);
            setError(
              t('comun.errorFoto', 'No se pudo tomar la foto. Puede guardar el registro sin ella.'),
            );
          } finally {
            setCargando(false);
          }
        }}
      />
      {error ? <Aviso tipo="alerta" texto={error} /> : null}
    </View>
  );
}

/** ¿Se puede grabar audio aquí? En el navegador hace falta MediaRecorder y micrófono. */
function vozDisponible(): boolean {
  if (!esWeb) return true;
  try {
    return (
      typeof MediaRecorder !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
    );
  } catch {
    return false;
  }
}

/** Si la grabadora falla al montarse (p. ej. sin soporte en el navegador), se oculta. */
class SinFallos extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  componentDidCatch(e: unknown) {
    console.warn('Nota de voz no disponible', e);
  }
  render() {
    return this.state.fallo ? null : this.props.children;
  }
}

/** Nota de voz. Se oculta si el entorno no permite grabar audio. */
export function CapturaVoz(props: {
  nota: ArchivoLocal | null;
  onCambio: (n: ArchivoLocal | null) => void;
}) {
  if (!vozDisponible()) return null;
  return (
    <SinFallos>
      <GrabadoraVoz {...props} />
    </SinFallos>
  );
}

function GrabadoraVoz({
  nota,
  onCambio,
}: {
  nota: ArchivoLocal | null;
  onCambio: (n: ArchivoLocal | null) => void;
}) {
  const { t } = useTranslation();
  const grabadora = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estado = useAudioRecorderState(grabadora);
  const [error, setError] = useState<string | null>(null);
  const mensajeError = t(
    'comun.errorVoz',
    'No se pudo grabar la nota de voz. Puede guardar el registro sin ella.',
  );
  return (
    <View style={{ marginVertical: espaciado.md }}>
      <Etiqueta>{t('comun.notaVoz')}</Etiqueta>
      {nota && !estado.isRecording ? (
        <TextoSecundario>{`${formatearNumero(nota.tamano / 1024, 0)} KB`}</TextoSecundario>
      ) : null}
      {estado.isRecording ? (
        <Boton
          titulo={`${t('comun.detener')} · ${Math.round(estado.durationMillis / 1000)} s`}
          icono="square"
          variante="peligro"
          onPress={async () => {
            try {
              await grabadora.stop();
              if (grabadora.uri) onCambio(await guardarAudio(grabadora.uri));
            } catch (e) {
              console.warn('No se pudo detener la grabación', e);
              setError(mensajeError);
            }
          }}
        />
      ) : (
        <Boton
          titulo={t('comun.grabar')}
          icono="mic"
          variante="secundario"
          onPress={async () => {
            setError(null);
            try {
              const p = await requestRecordingPermissionsAsync();
              if (!p.granted) {
                setError(t('comun.sinPermisoMicrofono', 'Sin permiso para usar el micrófono.'));
                return;
              }
              await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
              await grabadora.prepareToRecordAsync();
              grabadora.record();
            } catch (e) {
              console.warn('No se pudo iniciar la grabación', e);
              setError(mensajeError);
            }
          }}
        />
      )}
      {error ? <Aviso tipo="alerta" texto={error} /> : null}
    </View>
  );
}

export function InfoUbicacion({ ubicacion }: { ubicacion: Ubicacion | null }) {
  const { t } = useTranslation();
  if (!ubicacion) return <Estado tipo="alerta" texto={t('comun.sinUbicacion')} />;
  return (
    <View>
      <Etiqueta>{t('comun.ubicacion')}</Etiqueta>
      <Texto>
        {formatearNumero(ubicacion.lat, 5)}, {formatearNumero(ubicacion.lng, 5)} ·{' '}
        {t('comun.precision', { m: Math.round(ubicacion.precision) })}
      </Texto>
    </View>
  );
}
