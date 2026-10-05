/**
 * Configuración inicial del dispositivo (requiere señal una sola vez).
 */
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Texto, Titulo } from '@/componentes/Texto';
import { Aviso } from '@/componentes/Visuales';
import { CONFIG } from '@/config';
import { cargarConfiguracion } from '@/permisos/contexto';
import { configurarDispositivo } from '@/sync/configuracion';

export default function Configurar() {
  const { t } = useTranslation();
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState(CONFIG.apiUrlPorDefecto);
  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [nombre, setNombre] = useState(Device.deviceName ?? '');
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const configurar = async () => {
    setCargando(true);
    setError(null);
    setEstado(t('configurar.descargando'));
    try {
      await configurarDispositivo({ apiUrl, usuario, pin, nombre }, (p) => setEstado(t('configurar.mapa', { p })));
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
      <Texto style={{ marginBottom: 16 }}>{t('configurar.descripcion')}</Texto>
      <CampoTexto etiqueta={t('configurar.servidor')} valor={apiUrl} onCambio={setApiUrl} teclado="url" />
      <CampoTexto etiqueta={t('configurar.usuario')} valor={usuario} onCambio={setUsuario} />
      <CampoTexto etiqueta={t('configurar.pin')} valor={pin} onCambio={setPin} secreto teclado="number-pad" maxLength={4} />
      <CampoTexto etiqueta={t('configurar.nombre')} valor={nombre} onCambio={setNombre} autoCapitalize="sentences" />
      {estado ? <Aviso texto={estado} /> : null}
      {error ? <Aviso tipo="peligro" texto={error} /> : null}
      <Boton titulo={t('configurar.boton')} icono="download" onPress={configurar} cargando={cargando} deshabilitado={!usuario || pin.length !== 4} />
    </Pantalla>
  );
}
