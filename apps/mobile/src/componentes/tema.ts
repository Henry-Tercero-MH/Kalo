/**
 * Estilos derivados de @kalo/ui-tokens. No defina colores fuera de los tokens.
 */
import { bordes, campo, colores, espaciado, semantico, tipografia } from '@kalo/ui-tokens';
import { StyleSheet } from 'react-native';

export { bordes, campo, colores, espaciado, semantico, tipografia };

export const estilosBase = StyleSheet.create({
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.titulo,
    color: semantico.titulo,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.subtitulo,
    color: semantico.titulo,
    textTransform: 'uppercase',
  },
  cuerpo: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.tamanos.cuerpo,
    color: semantico.texto,
    lineHeight: 22,
  },
  secundario: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.tamanos.pequeno,
    color: semantico.textoSecundario,
  },
  etiqueta: {
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: tipografia.tamanos.etiqueta,
    color: semantico.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: tipografia.espaciadoEtiquetas,
  },
  numero: {
    fontFamily: tipografia.familias.titulo,
    fontVariant: ['tabular-nums'],
    color: semantico.titulo,
  },
  lineaTitulo: { height: bordes.lineaTitulo, backgroundColor: semantico.bordeFuerte },
  division: { height: bordes.lineaDivision, backgroundColor: semantico.borde },
});
