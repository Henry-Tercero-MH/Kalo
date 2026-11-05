/**
 * Inicio de sesión con el gafete QR. Si la cámara no está disponible (sin permiso, sin
 * cámara o navegador sin soporte) siempre queda la alternativa: volver al formulario de usuario y
 * contraseña. Si el permiso quedó bloqueado, se explica cómo activarlo en Ajustes.
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Linking, Platform, View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Pantalla } from '@/componentes/Pantalla';
import { Texto, Titulo } from '@/componentes/Texto';
import { Aviso } from '@/componentes/Visuales';
import { bordes, espaciado, semantico } from '@/componentes/tema';
import { iniciarConGafete } from '@/permisos/sesion';

export default function Gafete() {
  const { t } = useTranslation();
  const router = useRouter();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [sinCamara, setSinCamara] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const procesando = useRef(false);

  // Negado: se puede volver a pedir. Bloqueado: el teléfono ya no pregunta; solo en Ajustes.
  const negado = Boolean(permiso && !permiso.granted && permiso.status === 'denied');
  const bloqueado = negado && permiso?.canAskAgain === false;

  const mostrarError = (texto: string) => {
    setError(texto);
    // iOS no lee las regiones «live»; se anuncia el error explícitamente.
    AccessibilityInfo.announceForAccessibility(texto);
  };

  const volverAlFormulario = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/login');
  };

  const pedir = async () => {
    try {
      await pedirPermiso();
    } catch (e) {
      console.warn('No se pudo pedir el permiso de cámara', e);
      setSinCamara(true);
    }
  };

  return (
    <Pantalla volver>
      <Titulo>{t('login.gafete')}</Titulo>
      {sinCamara ? (
        <Aviso tipo="alerta" texto={t('login.camaraNoDisponible')} />
      ) : bloqueado ? (
        <>
          <Aviso tipo="alerta" texto={t('login.camaraBloqueada')} />
          {Platform.OS !== 'web' ? (
            <Boton
              titulo={t('login.abrirAjustes')}
              icono="settings"
              onPress={() => void Linking.openSettings()}
            />
          ) : null}
        </>
      ) : !permiso?.granted ? (
        <>
          {negado ? (
            <Aviso tipo="alerta" texto={t('login.camaraNegada')} />
          ) : (
            <Texto style={{ marginBottom: espaciado.md }}>{t('login.gafetePermiso')}</Texto>
          )}
          <Boton titulo={t('login.activarCamara')} icono="camera" onPress={pedir} />
        </>
      ) : (
        <>
          {/* La instrucción va antes del visor para que se lea aunque el visor ocupe la pantalla. */}
          <Texto style={{ marginBottom: espaciado.md }}>{t('login.gafeteAyuda')}</Texto>
          <View
            accessibilityLabel={t('login.camaraVisor')}
            style={{
              // Cuadrado del ancho disponible: el QR del gafete es cuadrado.
              aspectRatio: 1,
              borderWidth: bordes.lineaTitulo,
              borderColor: semantico.bordeFuerte,
            }}
          >
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
                setError(null);
                setVerificando(true);
                try {
                  const r = await iniciarConGafete(data);
                  if (r.ok) {
                    router.replace('/(tabs)');
                    return;
                  }
                  mostrarError(
                    r.motivo === 'bloqueado'
                      ? t('login.bloqueado', { min: r.minutos })
                      : t('login.gafeteNoReconocido'),
                  );
                } catch (e) {
                  console.warn('Error al leer el gafete', e);
                  mostrarError(t('login.gafeteNoReconocido'));
                }
                setVerificando(false);
                setTimeout(() => (procesando.current = false), 1500);
              }}
            />
          </View>
        </>
      )}
      {verificando ? <Aviso texto={t('login.verificandoGafete')} /> : null}
      {error ? <Aviso tipo="peligro" texto={error} /> : null}
      <View style={{ marginTop: espaciado.xl }}>
        <Texto style={{ marginBottom: espaciado.xs }}>{t('login.gafeteAlternativa')}</Texto>
        <Boton
          titulo={t('login.volverFormulario')}
          icono="user-round"
          variante="secundario"
          onPress={volverAlFormulario}
        />
      </View>
    </Pantalla>
  );
}
