/**
 * Estructura de pantalla: encabezado con logo + indicador de sincronización y línea negra
 * de 2 pt; contenido desplazable con márgenes cómodos.
 */
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSesion } from '@/permisos/sesion';
import { Icono } from './Icono';
import { IndicadorSync } from './IndicadorSync';
import { Logo } from './Visuales';
import { espaciado, estilosBase, semantico } from './tema';

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
  const router = useRouter();
  const tocar = useSesion((s) => s.tocar);
  return (
    <SafeAreaView style={estilos.raiz} edges={['top', 'left', 'right']} onTouchStart={tocar}>
      <View style={estilos.encabezado}>
        {volver ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => router.back()}
            style={estilos.volver}
            hitSlop={12}
          >
            <Icono nombre="chevron-left" tamano={28} color={semantico.titulo} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
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
    minHeight: 60,
  },
  volver: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  contenido: { padding: espaciado.lg, paddingBottom: espaciado.xxl * 2, flexGrow: 1 },
  pie: {
    padding: espaciado.lg,
    borderTopWidth: 1,
    borderTopColor: semantico.borde,
    backgroundColor: semantico.fondo,
    gap: espaciado.sm,
  },
});
