import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Pantalla } from '@/componentes/Pantalla';
import { Texto, Titulo } from '@/componentes/Texto';
import { Aviso } from '@/componentes/Visuales';
import { iniciarConGafete } from '@/permisos/sesion';

export default function Gafete() {
  const { t } = useTranslation();
  const router = useRouter();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const procesando = useRef(false);

  return (
    <Pantalla volver>
      <Titulo>{t('login.gafete')}</Titulo>
      {!permiso?.granted ? (
        <Boton titulo={t('comun.aceptar')} icono="camera" onPress={pedirPermiso} />
      ) : (
        <View style={{ height: 320, borderWidth: 2, borderColor: '#000' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={async ({ data }) => {
              if (procesando.current) return;
              procesando.current = true;
              const r = await iniciarConGafete(data);
              if (r.ok) router.replace('/(tabs)');
              else {
                setError(r.motivo === 'bloqueado' ? t('login.bloqueado', { min: r.minutos }) : t('login.gafeteNoReconocido'));
                setTimeout(() => (procesando.current = false), 1500);
              }
            }}
          />
        </View>
      )}
      <Texto style={{ marginTop: 12 }}>{t('login.gafeteAyuda')}</Texto>
      {error ? <Aviso tipo="peligro" texto={error} /> : null}
    </Pantalla>
  );
}
