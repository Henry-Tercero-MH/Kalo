/**
 * Vista de inicio: logo de Inversiones Kalo, nombre de la app y finca. Mientras se prepara la
 * base local muestra «Preparando datos…»; luego un botón lleva a configurar el dispositivo,
 * iniciar sesión o directo al inicio del día si ya hay sesión.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '@/componentes/Boton';
import { LOGO } from '@/componentes/logo-fuente';
import { colores, espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
import { CONFIG, USA_API } from '@/config';
import { configurarDemo } from '@/demo/activacion';
import { esModoDemo } from '@/demo/modo';
import { cargarConfiguracion } from '@/permisos/contexto';
import { useSesion } from '@/permisos/sesion';
import type { ConfiguracionDispositivo } from '@/utils/almacen-seguro';

/** Proporción del archivo del logo (960 × 200). */
const PROPORCION_LOGO = 960 / 200;

export default function Entrada() {
  const { t } = useTranslation();
  const router = useRouter();
  const usuario = useSesion((s) => s.usuario);
  const [estado, setEstado] = useState<'cargando' | 'sin_configurar' | 'listo'>('cargando');
  const [config, setConfig] = useState<ConfiguracionDispositivo | null>(null);
  const { width } = useWindowDimensions();
  // Logo a lo ancho del contenido, máximo 320 px (en computadora la app tiene ancho de celular).
  const anchoLogo = Math.min(width, 430) - espaciado.xl * 2;
  const tamanoLogo = {
    width: Math.min(anchoLogo, 320),
    height: Math.min(anchoLogo, 320) / PROPORCION_LOGO,
  };

  useEffect(() => {
    void (async () => {
      let c = await cargarConfiguracion();
      // Modo mock: el teléfono se prepara solo con los datos DEMO, sin pedir servidor.
      if (!USA_API && (!c || c.apiUrl !== 'demo')) {
        try {
          await configurarDemo();
        } catch (e) {
          // Registros reales sin enviar: se conserva la configuración actual.
          console.warn('No se pudieron cargar los datos DEMO', e);
        }
        c = await cargarConfiguracion();
      }
      setConfig(c);
      setEstado(c ? 'listo' : 'sin_configurar');
    })();
  }, []);

  const continuar = () => {
    if (estado === 'sin_configurar') return router.replace('/(auth)/configurar');
    router.replace(usuario ? '/(tabs)' : '/(auth)/login');
  };

  return (
    <SafeAreaView style={estilos.raiz}>
      <View style={estilos.franja} />
      <View style={estilos.centro}>
        {LOGO ? (
          <Image
            source={LOGO}
            style={tamanoLogo}
            resizeMode="contain"
            accessibilityLabel="Inversiones Kalo"
          />
        ) : (
          <Text style={estilos.logoTexto}>KALO</Text>
        )}
        <View style={[estilosBase.lineaTitulo, estilos.linea]} />
        <Text style={estilos.titulo}>{t('bienvenida.titulo')}</Text>
        <Text style={estilos.subtitulo}>{t('bienvenida.subtitulo')}</Text>
        {config?.fincaNombre ? (
          <View style={estilos.finca}>
            <Text style={estilosBase.etiqueta}>{t('inicio.finca')}</Text>
            <Text style={estilos.fincaNombre}>{config.fincaNombre}</Text>
          </View>
        ) : null}
      </View>

      <View style={estilos.pie}>
        {estado === 'cargando' ? (
          <View style={estilos.cargando} accessibilityLiveRegion="polite">
            <ActivityIndicator color={semantico.bordeFuerte} />
            <Text style={estilosBase.cuerpo}>{t('bienvenida.preparando')}</Text>
          </View>
        ) : (
          <Boton
            titulo={
              usuario
                ? t('bienvenida.continuar', { nombre: usuario.nombre.split(' ')[0] })
                : t('bienvenida.entrar')
            }
            icono="chevron-right"
            onPress={continuar}
          />
        )}
        <Text style={[estilosBase.secundario, estilos.version]}>
          {t('bienvenida.sinSenal')} · v{CONFIG.versionApp}
          {esModoDemo() ? ` · ${t('bienvenida.demo')}` : ''}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: semantico.fondo },
  franja: { height: 8, backgroundColor: colores.marca.verde },
  centro: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: espaciado.xl,
  },
  logoTexto: {
    fontFamily: tipografia.familias.portada,
    fontSize: 64,
    color: semantico.titulo,
  },
  linea: { marginTop: espaciado.xl, marginBottom: espaciado.lg },
  titulo: {
    fontFamily: tipografia.familias.portada,
    fontSize: tipografia.tamanos.portada,
    color: semantico.titulo,
    textTransform: 'uppercase',
    lineHeight: tipografia.tamanos.portada * 1.15,
  },
  subtitulo: { ...estilosBase.cuerpo, marginTop: espaciado.xs, color: semantico.textoSecundario },
  finca: {
    marginTop: espaciado.xl,
    borderLeftWidth: 4,
    borderLeftColor: colores.marca.verde,
    paddingLeft: espaciado.md,
    paddingVertical: espaciado.xs,
  },
  fincaNombre: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.subtitulo,
    color: semantico.titulo,
    marginTop: 2,
  },
  pie: { paddingHorizontal: espaciado.xl, paddingBottom: espaciado.xl, gap: espaciado.md },
  cargando: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
  version: { textAlign: 'center' },
});
