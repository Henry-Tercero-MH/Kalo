import type { ReactNode } from 'react';
import { Text, View, type StyleProp, type TextStyle } from 'react-native';
import { espaciado, estilosBase } from './tema';

type Props = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };

export const Texto = ({ children, style, numberOfLines }: Props) => (
  <Text style={[estilosBase.cuerpo, style]} numberOfLines={numberOfLines}>
    {children}
  </Text>
);

export const TextoSecundario = ({ children, style }: Props) => (
  <Text style={[estilosBase.secundario, style]}>{children}</Text>
);

export const Etiqueta = ({ children, style }: Props) => <Text style={[estilosBase.etiqueta, style]}>{children}</Text>;

/** Título en Archivo 800 MAYÚSCULAS con línea negra de 2 pt debajo. */
export function Titulo({ children, style, sinLinea }: Props & { sinLinea?: boolean }) {
  return (
    <View style={{ marginBottom: espaciado.lg }}>
      <Text accessibilityRole="header" style={[estilosBase.titulo, style]}>
        {children}
      </Text>
      {!sinLinea && <View style={[estilosBase.lineaTitulo, { marginTop: espaciado.sm }]} />}
    </View>
  );
}

export function Subtitulo({ children, style }: Props) {
  return (
    <View style={{ marginTop: espaciado.lg, marginBottom: espaciado.sm }}>
      <Text accessibilityRole="header" style={[estilosBase.subtitulo, style]}>
        {children}
      </Text>
      <View style={[estilosBase.lineaTitulo, { marginTop: espaciado.xs }]} />
    </View>
  );
}

export const Division = () => <View style={[estilosBase.division, { marginVertical: espaciado.md }]} />;
