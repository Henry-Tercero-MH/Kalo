/**
 * Configuración inicial del dispositivo (requiere señal una sola vez).
 * Arriba, «Probar demo sin servidor»: datos DEMO precargados y sincronización simulada.
 */
import * as Device from 'expo-device';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Subtitulo, Texto, Titulo } from '@/componentes/Texto';
import { Aviso, Tarjeta } from '@/componentes/Visuales';
import { espaciado } from '@/componentes/tema';
import { CONFIG, USA_API } from '@/config';
import { configurarDemo, ErrorPendientesSinEnviar } from '@/demo/activacion';
import { cargarConfiguracion } from '@/permisos/contexto';
import { configurarDispositivo } from '@/sync/configuracion';

export default function Configurar() {
  // Modo mock: no hay servidor que configurar; la entrada carga los datos DEMO.
  if (!USA_API) return <Redirect href="/" />;
  return <ConfigurarServidor />;
}

function ConfigurarServidor() {
  const { t } = useTranslation();
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState(CONFIG.apiUrlPorDefecto);
  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [nombre, setNombre] = useState(Device.deviceName ?? '');
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoDemo, setCargandoDemo] = useState(false);
  const [errorDemo, setErrorDemo] = useState<string | null>(null);

  const probarDemo = async () => {
    setCargandoDemo(true);
    setErrorDemo(null);
    try {
      await configurarDemo();
      router.replace('/(auth)/login');
    } catch (e) {
      setErrorDemo(
        e instanceof ErrorPendientesSinEnviar
          ? t('configurar.demoPendientes', { n: e.pendientes })
          : t('configurar.demoError', { e: e instanceof Error ? e.message : String(e) }),
      );
    } finally {
      setCargandoDemo(false);
    }
  };

  const configurar = async () => {
    setCargando(true);
    setError(null);
    setEstado(t('configurar.descargando'));
    try {
      await configurarDispositivo({ apiUrl, usuario, pin, nombre }, (p) =>
        setEstado(t('configurar.mapa', { p })),
      );
      await cargarConfiguracion();
      router.replace('/(auth)/login');
    } catch (e) {
      setError(t('configurar.error', { e: e instanceof Error ? e.message : String(e) }));
      setEstado(null);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Pantalla>
      <Titulo>{t('configurar.titulo')}</Titulo>
      <Tarjeta destacada>
        <Subtitulo>{t('configurar.demoTitulo')}</Subtitulo>
        <Texto style={{ marginBottom: espaciado.md }}>{t('configurar.demoAyuda')}</Texto>
        <Boton
          titulo={t('configurar.demoBoton')}
          icono="play"
          onPress={probarDemo}
          cargando={cargandoDemo}
          deshabilitado={cargando}
        />
        {cargandoDemo ? <Aviso texto={t('configurar.demoCargando')} /> : null}
        {errorDemo ? <Aviso tipo="peligro" texto={errorDemo} /> : null}
      </Tarjeta>

      <Subtitulo>{t('configurar.servidorTitulo')}</Subtitulo>
      <Texto style={{ marginBottom: 16 }}>{t('configurar.descripcion')}</Texto>
      <CampoTexto
        etiqueta={t('configurar.servidor')}
        valor={apiUrl}
        onCambio={setApiUrl}
        teclado="url"
      />
      <CampoTexto etiqueta={t('configurar.usuario')} valor={usuario} onCambio={setUsuario} />
      <CampoTexto
        etiqueta={t('configurar.pin')}
        valor={pin}
        onCambio={setPin}
        secreto
        teclado="number-pad"
        maxLength={4}
      />
      <CampoTexto
        etiqueta={t('configurar.nombre')}
        valor={nombre}
        onCambio={setNombre}
        autoCapitalize="sentences"
      />
      {estado ? <Aviso texto={estado} /> : null}
      {error ? <Aviso tipo="peligro" texto={error} /> : null}
      <Boton
        titulo={t('configurar.boton')}
        icono="download"
        variante="secundario"
        onPress={configurar}
        cargando={cargando}
        deshabilitado={!usuario || pin.length !== 4 || cargandoDemo}
      />
    </Pantalla>
  );
}
