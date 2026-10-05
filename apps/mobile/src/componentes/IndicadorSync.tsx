/**
 * Indicador permanente de sincronización: estado con color + palabra y número de
 * registros y archivos en cola. Al tocarlo abre la pantalla de sincronización.
 */
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { resumir, useEstadoSync, type ResumenSync } from '@/sync/estado';
import { Icono } from './Icono';
import { semantico, tipografia } from './tema';

const VISUAL: Record<ResumenSync, { color: string; icono: string; clave: string }> = {
  sincronizado: { color: semantico.exito, icono: 'cloud-check', clave: 'sync.sincronizado' },
  pendiente: { color: semantico.alerta, icono: 'cloud-alert', clave: 'sync.pendiente' },
  sincronizando: { color: semantico.info, icono: 'refresh-cw', clave: 'sync.sincronizando' },
  error: { color: semantico.peligro, icono: 'cloud-alert', clave: 'sync.error' },
  sinRed: { color: semantico.alerta, icono: 'cloud-off', clave: 'sync.sinRed' },
};

export function IndicadorSync() {
  const { t } = useTranslation();
  const router = useRouter();
  const estado = useEstadoSync();
  const resumen = resumir(estado);
  const v = VISUAL[resumen];
  const cola = estado.pendientes + estado.archivosPendientes;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(v.clave)}${cola ? `, ${cola} en cola` : ''}`}
      onPress={() => router.push('/(tabs)/sincronizar')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}
    >
      <View style={{ width: 10, height: 10, backgroundColor: v.color }} />
      <Icono nombre={v.icono} tamano={20} color={semantico.titulo} />
      <Text style={{ fontFamily: tipografia.familias.titulo, fontSize: 12, color: semantico.titulo, letterSpacing: 0.8 }}>
        {t(v.clave)}
        {cola ? ` · ${estado.pendientes}/${estado.archivosPendientes}` : ''}
      </Text>
    </Pressable>
  );
}
