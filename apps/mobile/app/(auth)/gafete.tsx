/**
 * Inicio de sesión con el gafete QR. Si la cámara no está disponible (sin permiso, sin
 * cámara o navegador sin soporte) siempre queda la alternativa: elegir el usuario de la lista.
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Pantalla } from '@/componentes/Pantalla';
import { Texto, Titulo } from '@/componentes/Texto';
import { Aviso } from '@/componentes/Visuales';
import { espaciado } from '@/componentes/tema';
import { iniciarConGafete } from '@/permisos/sesion';

export default function Gafete() {
  const { t } = useTranslation();
  const router = useRouter();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [sinCamara, setSinCamara] = useState(false);
  const procesando = useRef(false);

  const elegirDeLista = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/login');
  };

  const pedir = async () => {
    try {
      const r = await pedirPermiso();
      if (!r.granted) {
        setError(t('comun.sinPermisoCamara', 'Sin permiso para usar la cámara.'));
      }
    } catch (e) {
      console.warn('No se pudo pedir el permiso de cámara', e);
      setSinCamara(true);
    }
  };

  return (
    <Pantalla volver>
      <Titulo>{t('login.gafete')}</Titulo>
      {sinCamara ? (
        <Aviso
          tipo="alerta"
          texto={t(
            'comun.camaraNoDisponible',
            'La cámara no está disponible en este dispositivo o navegador.',
          )}
        />
      ) : !permiso?.granted ? (
        <Boton titulo={t('comun.aceptar')} icono="camera" onPress={pedir} />
      ) : (
        <View style={{ height: 320, borderWidth: 2, borderColor: '#000' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onMountError={(e) => {
              console.warn('Cámara no disponible', e.message);
              setSinCamara(true);
            }}
            onBarcodeScanned={async ({ data }) => {
              if (procesando.current) return;
              procesando.current = true;
              try {
                const r = await iniciarConGafete(data);
                if (r.ok) {
                  router.replace('/(tabs)');
                  return;
                }
                setError(
                  r.motivo === 'bloqueado'
                    ? t('login.bloqueado', { min: r.minutos })
                    : t('login.gafeteNoReconocido'),
                );
              } catch (e) {
                console.warn('Error al leer el gafete', e);
                setError(t('login.gafeteNoReconocido'));
              }
              setTimeout(() => (procesando.current = false), 1500);
            }}
          />
        </View>
      )}
      {!sinCamara ? <Texto style={{ marginTop: 12 }}>{t('login.gafeteAyuda')}</Texto> : null}
      {error ? <Aviso tipo="peligro" texto={error} /> : null}
      <View style={{ marginTop: espaciado.lg }}>
        <Boton
          titulo={t('login.elegirDeLista', 'Elegir usuario de la lista')}
          icono="users"
          variante="secundario"
          onPress={elegirDeLista}
        />
      </View>
    </Pantalla>
  );
}
