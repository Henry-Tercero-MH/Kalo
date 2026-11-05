/**
 * Estructura de pantalla: encabezado con logo + indicador de sincronización y línea negra
 * de 2 pt; contenido desplazable con márgenes cómodos.
 */
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSesion } from '@/permisos/sesion';
import { BotonIcono } from './Boton';
import { FranjaSuperior } from './FranjaSuperior';
import { IndicadorSync } from './IndicadorSync';
import { Logo } from './Visuales';
import { bordes, campo, espaciado, estilosBase, semantico, tamanoIcono } from './tema';

export function Pantalla({
  children,
  volver,
  sinDesplazamiento,
  pie,
}: {
  children: ReactNode;
  volver?: boolean;
  sinDesplazamiento?: boolean;
  /** Botones fijos al pie (p. ej. Anterior / Siguiente). */
  pie?: ReactNode;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const tocar = useSesion((s) => s.tocar);
  return (
    <SafeAreaView style={estilos.raiz} edges={['left', 'right']} onTouchStart={tocar}>
      <FranjaSuperior />
      <View style={estilos.encabezado}>
        {volver ? (
          <BotonIcono
            icono="atras"
            tamano={tamanoIcono.grande}
            etiqueta={t('comun.volver')}
            onPress={() => router.back()}
          />
        ) : null}
        <View style={{ flex: 1, minWidth: 0, marginRight: espaciado.sm }}>
          <Logo />
        </View>
        <IndicadorSync />
      </View>
      <View style={estilosBase.lineaTitulo} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {sinDesplazamiento ? (
          <View style={estilos.contenido}>{children}</View>
        ) : (
          <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        )}
        {pie ? <View style={estilos.pie}>{pie}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: semantico.fondo },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.md,
    gap: espaciado.md,
    minHeight: campo.alturaTactil + espaciado.xs,
  },
  contenido: { padding: espaciado.lg, paddingBottom: espaciado.xxl * 2, flexGrow: 1 },
  pie: {
    padding: espaciado.lg,
    borderTopWidth: bordes.lineaDivision,
    borderTopColor: semantico.borde,
    backgroundColor: semantico.fondo,
    gap: espaciado.sm,
  },
});
