import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';
import { avisar, confirmar } from '@/componentes/alerta';
import { Boton } from '@/componentes/Boton';
import { Pantalla } from '@/componentes/Pantalla';
import { Texto, Titulo } from '@/componentes/Texto';
import { Dato, Tarjeta } from '@/componentes/Visuales';
import { espaciado, semantico } from '@/componentes/tema';
import { CONFIG, USA_API } from '@/config';
import { salirDelDemo } from '@/demo/activacion';
import { tieneMapLibre } from '@/demo/entorno';
import { EtiquetaDemo } from '@/demo/EtiquetaDemo';
import { esModoDemo } from '@/demo/modo';
import { descargarMapaFinca } from '@/gps/mapas-offline';
import { useConfiguracion } from '@/permisos/contexto';
import { useSesion } from '@/permisos/sesion';
import { almacen } from '@/utils/almacen-seguro';

export default function Perfil() {
  const { t } = useTranslation();
  const router = useRouter();
  const { usuario, cerrar } = useSesion();
  const config = useConfiguracion();
  const [ahorro, setAhorro] = useState(false);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  const demo = esModoDemo();

  const salir = async () => {
    setSaliendo(true);
    try {
      await salirDelDemo();
      // Modo mock: la entrada vuelve a cargar los datos DEMO desde cero.
      router.replace(USA_API ? '/(auth)/configurar' : '/');
    } catch (e) {
      avisar(t('sync.error'), String(e));
    } finally {
      setSaliendo(false);
    }
  };

  const confirmarSalida = () => confirmar(
      t(USA_API ? 'perfil.salirDemoTitulo' : 'perfil.reiniciarDemoTitulo'),
      t(USA_API ? 'perfil.salirDemoTexto' : 'perfil.reiniciarDemoTexto'),
      () => void salir(),
    );

  useEffect(() => {
    void almacen.preferencias().then((p) => setAhorro(p.ahorroBateria));
  }, []);

  return (
    <Pantalla>
      <Titulo>{t('perfil.titulo')}</Titulo>
      <EtiquetaDemo conTexto />
      <Tarjeta>
        <Dato etiqueta={t('login.usuario')} valor={usuario?.nombre ?? '—'} />
        <Dato etiqueta={t('perfil.rol')} valor={usuario?.rolNombre ?? '—'} />
        <Dato etiqueta={t('perfil.dispositivo')} valor={config?.dispositivoId.slice(0, 8) ?? '—'} />
        <Dato etiqueta={t('perfil.version')} valor={CONFIG.versionApp} />
      </Tarjeta>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 56,
          marginBottom: espaciado.md,
        }}
      >
        <Texto style={{ flex: 1 }}>{t('perfil.ahorro')}</Texto>
        <Switch
          value={ahorro}
          trackColor={{ true: semantico.acentoOscuro, false: semantico.borde }}
          onValueChange={async (v) => {
            setAhorro(v);
            await almacen.guardarPreferencias({
              ...(await almacen.preferencias()),
              ahorroBateria: v,
            });
          }}
        />
      </View>
      <Boton
        titulo={t('perfil.cambiarUsuario')}
        icono="log-out"
        onPress={() => {
          cerrar();
          router.replace('/(auth)/login');
        }}
      />
      {tieneMapLibre ? (
        <Boton
          titulo={progreso !== null ? `${progreso} %` : t('perfil.mapaOffline')}
          icono="download"
          variante="secundario"
          cargando={progreso !== null && progreso < 100}
          onPress={async () => {
            if (!config?.bbox) return;
            setProgreso(0);
            try {
              await descargarMapaFinca(config.bbox, setProgreso);
            } catch (e) {
              avisar(t('sync.error'), String(e));
            } finally {
              setProgreso(null);
            }
          }}
        />
      ) : null}
      {demo ? (
        <Boton
          titulo={t(USA_API ? 'perfil.salirDemo' : 'perfil.reiniciarDemo')}
          variante="peligro"
          icono="log-out"
          cargando={saliendo}
          onPress={confirmarSalida}
        />
      ) : (
        <Boton
          titulo={t('perfil.reconfigurar')}
          variante="secundario"
          icono="settings"
          onPress={() => router.push('/(auth)/configurar')}
        />
      )}
    </Pantalla>
  );
}
