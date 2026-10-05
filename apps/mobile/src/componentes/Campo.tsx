/**
 * Piezas de formulario reutilizables: selector de lote (propuesto por GPS), captura de
 * fotos, nota de voz y ubicación.
 */
import { formatearNumero, type Fila } from '@kalo/shared';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, View } from 'react-native';
import { useLoteActual, useLotes } from '@/gps/lote-actual';
import type { Ubicacion } from '@/gps/ubicacion';
import { guardarAudio, tomarFoto, type ArchivoLocal } from '@/utils/archivos';
import { Boton } from './Boton';
import { Opciones } from './Controles';
import { Etiqueta, Texto, TextoSecundario } from './Texto';
import { Estado } from './Visuales';
import { espaciado, semantico } from './tema';

/** Selector de lote: propone el lote detectado por GPS; el usuario puede cambiarlo. */
export function SelectorLote({ valor, onCambio }: { valor: string | null; onCambio: (id: string) => void }) {
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
        opciones={lotes.map((l) => ({ valor: l.id, etiqueta: `${l.codigo} · ${formatearNumero(l.hectareas, 1)} ha` }))}
        valor={valor}
        onCambio={(v) => onCambio(v as string)}
      />
    </View>
  );
}

export function nombreLote(lotes: Fila<'lotes'>[], id: string | null) {
  return lotes.find((l) => l.id === id)?.nombre ?? '—';
}

export function CapturaFotos({ fotos, onCambio }: { fotos: ArchivoLocal[]; onCambio: (f: ArchivoLocal[]) => void }) {
  const { t } = useTranslation();
  const [cargando, setCargando] = useState(false);
  return (
    <View style={{ marginVertical: espaciado.md }}>
      <Etiqueta>{t('comun.fotos')}</Etiqueta>
      {fotos.length > 0 && (
        <ScrollView horizontal style={{ marginVertical: espaciado.sm }}>
          {fotos.map((f) => (
            <Image key={f.uri} source={{ uri: f.uri }} style={{ width: 96, height: 96, marginRight: espaciado.sm, borderWidth: 1, borderColor: semantico.borde }} />
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
          try {
            const f = await tomarFoto();
            if (f) onCambio([...fotos, f]);
          } finally {
            setCargando(false);
          }
        }}
      />
    </View>
  );
}

export function CapturaVoz({ nota, onCambio }: { nota: ArchivoLocal | null; onCambio: (n: ArchivoLocal | null) => void }) {
  const { t } = useTranslation();
  const grabadora = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estado = useAudioRecorderState(grabadora);
  return (
    <View style={{ marginVertical: espaciado.md }}>
      <Etiqueta>{t('comun.notaVoz')}</Etiqueta>
      {nota && !estado.isRecording ? <TextoSecundario>{`${formatearNumero(nota.tamano / 1024, 0)} KB`}</TextoSecundario> : null}
      {estado.isRecording ? (
        <Boton
          titulo={`${t('comun.detener')} · ${Math.round(estado.durationMillis / 1000)} s`}
          icono="square"
          variante="peligro"
          onPress={async () => {
            await grabadora.stop();
            if (grabadora.uri) onCambio(guardarAudio(grabadora.uri));
          }}
        />
      ) : (
        <Boton
          titulo={t('comun.grabar')}
          icono="mic"
          variante="secundario"
          onPress={async () => {
            const p = await requestRecordingPermissionsAsync();
            if (!p.granted) return;
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
            await grabadora.prepareToRecordAsync();
            grabadora.record();
          }}
        />
      )}
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
        {formatearNumero(ubicacion.lat, 5)}, {formatearNumero(ubicacion.lng, 5)} · {t('comun.precision', { m: Math.round(ubicacion.precision) })}
      </Texto>
    </View>
  );
}
