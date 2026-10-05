/**
 * Etiqueta visible «DEMO» para que nadie confunda los datos ficticios con datos reales.
 */
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { espaciado, semantico, tipografia } from '@/componentes/tema';
import { esModoDemo } from './modo';

export function EtiquetaDemo({ conTexto }: { conTexto?: boolean }) {
  const { t } = useTranslation();
  if (!esModoDemo()) return null;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={t('comun.modoDemo')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: espaciado.sm,
        marginBottom: espaciado.md,
      }}
    >
      <View
        style={{
          backgroundColor: semantico.alerta,
          paddingHorizontal: espaciado.sm,
          paddingVertical: espaciado.xs,
        }}
      >
        <Text
          style={{
            fontFamily: tipografia.familias.titulo,
            color: semantico.titulo,
            letterSpacing: 1,
          }}
        >
          {t('comun.demo')}
        </Text>
      </View>
      {conTexto ? (
        <Text style={{ flex: 1, fontFamily: tipografia.familias.cuerpo, color: semantico.texto }}>
          {t('comun.modoDemo')}
        </Text>
      ) : null}
    </View>
  );
}
