/**
 * Vista de inicio: logo de Inversiones Kalo centrado, barra de carga y «Cargando…» mientras se
 * prepara la base local. Al terminar pasa sola a configurar el dispositivo, iniciar sesión o
 * al inicio del día si ya hay sesión.
 */
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LOGO } from '@/componentes/logo-fuente';
import { espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
import { CONFIG, USA_API } from '@/config';
import { configurarDemo } from '@/demo/activacion';
import { esModoDemo } from '@/demo/modo';
import { cargarConfiguracion } from '@/permisos/contexto';
import { useSesion } from '@/permisos/sesion';

/** Proporción del archivo del logo (960 × 200). */
const PROPORCION_LOGO = 960 / 200;
/** Tiempo mínimo en pantalla para que la carga se lea, aunque los datos estén listos antes. */
const MINIMO_MS = 1200;

/** Prepara la configuración del dispositivo; en modo mock carga los datos DEMO. */
async function preparar() {
  let c = await cargarConfiguracion();
  if (!USA_API && (!c || c.apiUrl !== 'demo')) {
    try {
      await configurarDemo();
    } catch (e) {
      // Registros reales sin enviar: se conserva la configuración actual.
      console.warn('No se pudieron cargar los datos DEMO', e);
    }
    c = await cargarConfiguracion();
  }
  return c;
}

export default function Entrada() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const progreso = useRef(new Animated.Value(0)).current;
  const [anchoBarra, setAnchoBarra] = useState(0);

  // En computadora la app tiene ancho de celular (máximo 430 px).
  const anchoLogo = Math.min(Math.min(width, 430) - espaciado.xl * 2, 280);

  useEffect(() => {
    let activo = true;
    // Avanza hasta 90 % mientras carga; el último tramo se completa al terminar.
    const avance = Animated.timing(progreso, {
      toValue: 0.9,
      duration: 2500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    avance.start();
    void (async () => {
      const [c] = await Promise.all([preparar(), new Promise((r) => setTimeout(r, MINIMO_MS))]);
      if (!activo) return;
      avance.stop();
      Animated.timing(progreso, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start(() => {
        if (!activo) return;
        if (!c) return router.replace('/(auth)/configurar');
        router.replace(useSesion.getState().usuario ? '/(tabs)' : '/(auth)/login');
      });
    })();
    return () => {
      activo = false;
      avance.stop();
    };
  }, [progreso, router]);

  return (
    <SafeAreaView style={estilos.raiz}>
      <View style={estilos.centro}>
        {LOGO ? (
          <Image
            source={LOGO}
            style={{ width: anchoLogo, height: anchoLogo / PROPORCION_LOGO }}
            resizeMode="contain"
            accessibilityLabel="Inversiones Kalo"
          />
        ) : (
          <Text style={estilos.logoTexto}>KALO</Text>
        )}
        <View
          style={[estilos.barra, { width: anchoLogo }]}
          onLayout={(e) => setAnchoBarra(e.nativeEvent.layout.width)}
          accessibilityRole="progressbar"
          accessibilityLabel={t('bienvenida.cargando')}
        >
          <Animated.View
            style={[
              estilos.relleno,
              {
                width: progreso.interpolate({ inputRange: [0, 1], outputRange: [0, anchoBarra] }),
              },
            ]}
          />
        </View>
        <Text style={estilos.cargando} accessibilityLiveRegion="polite">
          {t('bienvenida.cargando')}
        </Text>
      </View>
      <Text style={[estilosBase.secundario, estilos.pie]}>
        v{CONFIG.versionApp}
        {esModoDemo() ? ` · ${t('bienvenida.demo')}` : ''}
      </Text>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: semantico.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoTexto: {
    fontFamily: tipografia.familias.portada,
    fontSize: 64,
    color: semantico.titulo,
  },
  barra: {
    height: 6,
    marginTop: espaciado.xl,
    backgroundColor: semantico.borde,
    overflow: 'hidden',
  },
  relleno: { height: '100%', backgroundColor: semantico.acento },
  cargando: {
    ...estilosBase.etiqueta,
    marginTop: espaciado.md,
  },
  pie: { textAlign: 'center', paddingBottom: espaciado.lg },
});
