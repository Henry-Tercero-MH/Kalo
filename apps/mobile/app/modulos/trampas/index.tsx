/**
 * Trampas de picudo: escanear el QR de la trampa y registrar la cantidad capturada.
 * Si la cámara no está disponible (sin permiso, sin cámara o navegador sin soporte) se
 * pasa a «Elegir trampa de la lista».
 */
import type { Fila } from '@kalo/shared';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Contador, Opciones } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Texto, Titulo } from '@/componentes/Texto';
import { Aviso, Dato, Tarjeta } from '@/componentes/Visuales';
import { espaciado, semantico } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { obtenerUbicacion } from '@/gps/ubicacion';
import { despuesDeGuardar, useRequierePermiso } from '@/modulos/comun';
import { buscarTrampaPorQr, guardarLectura } from '@/modulos/trampas/servicio';
import { useContextoEscritura } from '@/permisos/contexto';

export default function Trampas() {
  const { t } = useTranslation();
  useRequierePermiso('trampas:crear');
  const ctx = useContextoEscritura();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const todas = useConsulta('trampas');
  const lotes = useConsulta('lotes');
  const [trampa, setTrampa] = useState<Fila<'trampas'> | null>(null);
  const [manual, setManual] = useState(false);
  const [cantidad, setCantidad] = useState<number | null>(0);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const leyendo = useRef(false);

  const sinCamara = (motivo: unknown) => {
    console.warn('Cámara no disponible', motivo);
    setError(
      t(
        'comun.camaraNoDisponible',
        'La cámara no está disponible en este dispositivo o navegador.',
      ),
    );
    setManual(true);
  };

  const pedirCamara = async () => {
    try {
      const r = await pedirPermiso();
      if (!r.granted) {
        setError(t('comun.sinPermisoCamara', 'Sin permiso para usar la cámara.'));
        setManual(true);
      }
    } catch (e) {
      sinCamara(e);
    }
  };

  if (trampa) {
    return (
      <Pantalla volver>
        <Titulo>{t('trampas.titulo')}</Titulo>
        <Tarjeta destacada>
          <Dato etiqueta="QR" valor={trampa.codigo_qr.replace('KALO-TRAMPA:', '')} />
          <Texto>{`${trampa.nombre} · ${lotes.find((l) => l.id === trampa.lote_id)?.nombre ?? ''}`}</Texto>
        </Tarjeta>
        <Etiqueta>{t('trampas.cantidad')}</Etiqueta>
        <View style={{ marginVertical: espaciado.sm }}>
          <Contador valor={cantidad} onCambio={setCantidad} min={0} max={999} unidad="picudos" />
        </View>
        <Boton
          titulo={t('comun.guardar')}
          icono="check"
          cargando={guardando}
          deshabilitado={cantidad === null}
          onPress={async () => {
            if (!ctx || cantidad === null) return;
            setGuardando(true);
            setError(null);
            try {
              const ubicacion = await obtenerUbicacion(6000).catch(() => null);
              await guardarLectura(
                { trampaId: trampa.id, loteId: trampa.lote_id, cantidad, ubicacion },
                ctx,
              );
              despuesDeGuardar(() => {
                setTrampa(null);
                setCantidad(0);
                leyendo.current = false;
              });
            } catch (e) {
              setError(
                `${t('comun.errorGuardar', 'No se pudo guardar.')} ${e instanceof Error ? e.message : ''}`,
              );
            } finally {
              setGuardando(false);
            }
          }}
        />
        <Boton
          titulo={t('comun.cancelar')}
          variante="secundario"
          onPress={() => {
            setTrampa(null);
            leyendo.current = false;
          }}
        />
        {error ? <Aviso tipo="peligro" texto={error} /> : null}
      </Pantalla>
    );
  }

  return (
    <Pantalla volver>
      <Titulo>{t('trampas.titulo')}</Titulo>
      {manual ? (
        <Opciones
          opciones={todas.map((x) => ({
            valor: x.id,
            etiqueta: `${x.codigo_qr.replace('KALO-TRAMPA:', '')} · ${x.nombre}`,
          }))}
          valor={null}
          onCambio={(id) => setTrampa(todas.find((x) => x.id === id) ?? null)}
        />
      ) : !permiso?.granted ? (
        <Boton titulo={t('comun.aceptar')} icono="camera" onPress={pedirCamara} />
      ) : (
        <>
          <Texto style={{ marginBottom: espaciado.sm }}>{t('trampas.escanear')}</Texto>
          <View style={{ height: 340, borderWidth: 2, borderColor: semantico.bordeFuerte }}>
            <CameraView
              style={{ flex: 1 }}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onMountError={(e) => sinCamara(e.message)}
              onBarcodeScanned={async ({ data }) => {
                if (leyendo.current) return;
                leyendo.current = true;
                const encontrada = await buscarTrampaPorQr(data).catch(() => null);
                if (encontrada) {
                  setError(null);
                  setTrampa(encontrada);
                } else {
                  setError(t('trampas.noEncontrada', { c: data }));
                  setTimeout(() => (leyendo.current = false), 1500);
                }
              }}
            />
          </View>
        </>
      )}
      {error ? <Aviso tipo="peligro" texto={error} /> : null}
      <View style={{ marginTop: espaciado.md }}>
        <Boton
          titulo={manual ? t('trampas.escanear') : t('trampas.manual')}
          variante="secundario"
          icono={manual ? 'scan-qr-code' : 'clipboard-list'}
          onPress={() => {
            setError(null);
            setManual((m) => !m);
          }}
        />
      </View>
    </Pantalla>
  );
}
