/**
 * Estilos derivados de @kalo/ui-tokens. No defina colores fuera de los tokens.
 */
import {
  bordes,
  campo,
  colores,
  espaciado,
  semantico,
  tamanosIcono,
  tipografia,
} from '@kalo/ui-tokens';
import { Platform, StyleSheet } from 'react-native';

export { bordes, campo, colores, espaciado, semantico, tipografia };

/**
 * Bordes de los controles (campos, opciones, contador). El gris de divisiones (#e2ded7) no
 * llega a 3:1 sobre blanco y el campo no se distingue al sol (WCAG 1.4.11); por eso el borde
 * normal de un control es gris oscuro (n500, 5,3:1) de 1 pt, y foco o selección es negro de 2 pt.
 */
export const control = {
  borde: semantico.bordeControl,
  grosor: bordes.lineaDivision,
  bordeFoco: semantico.bordeFuerte,
  grosorFoco: bordes.lineaTitulo,
  /** Lo que crece el borde al enfocar; se descuenta del padding para que el texto no salte. */
  ajusteFoco: bordes.lineaTitulo - bordes.lineaDivision,
  /**
   * Borde de tarjetas y filas que se tocan: el mismo gris oscuro de los campos (5,3:1). El gris
   * de división (1,3:1) queda para separadores y para tarjetas que solo muestran información.
   */
  bordeTocable: semantico.bordeTocable,
  /** Fondo de una opción o fila seleccionada (siempre con borde negro o marca, no solo color). */
  fondoSeleccion: semantico.seleccion,
} as const;

/** Tamaños de ícono: escala de @kalo/ui-tokens (pequeno 18 … enorme 32). */
export const tamanoIcono = tamanosIcono;

export const estilosBase = StyleSheet.create({
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.titulo,
    color: semantico.titulo,
    textTransform: 'uppercase',
    letterSpacing: tipografia.espaciadoLetras.titulo,
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
    lineHeight: tipografia.alturaLinea.cuerpo,
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
  /** Nombre de un trabajador en listas y tarjetas: un solo peso (Archivo 800) en toda la app. */
  nombre: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.cuerpo,
    color: semantico.titulo,
  },
  /** Fondo de cualquier elemento tocable mientras se presiona. */
  presionado: { backgroundColor: semantico.fondoSuave },
  lineaTitulo: { height: bordes.lineaTitulo, backgroundColor: semantico.bordeFuerte },
  division: { height: bordes.lineaDivision, backgroundColor: semantico.borde },
});

/**
 * Estados de un campo de entrada: normal (1 pt gris oscuro), foco (2 pt negro), error (2 pt rojo),
 * deshabilitado (fondo suave, texto secundario) y solo lectura (borde de división, sin foco).
 */
export const estilosCampo = StyleSheet.create({
  marco: {
    minHeight: campo.alturaTactil,
    borderWidth: control.grosor,
    borderColor: control.borde,
    borderRadius: bordes.radio,
    backgroundColor: semantico.fondo,
    paddingHorizontal: espaciado.md,
  },
  marcoFoco: {
    borderWidth: control.grosorFoco,
    borderColor: control.bordeFoco,
    paddingHorizontal: espaciado.md - control.ajusteFoco,
  },
  marcoError: {
    borderWidth: control.grosorFoco,
    borderColor: semantico.peligro,
    paddingHorizontal: espaciado.md - control.ajusteFoco,
  },
  marcoDeshabilitado: { backgroundColor: semantico.fondoSuave, borderColor: semantico.borde },
  marcoSoloLectura: { backgroundColor: semantico.fondoSuave },
  texto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.tamanos.subtitulo,
    color: semantico.titulo,
    // En web el navegador dibuja su propio contorno al enfocar; ya lo marca el borde negro.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  textoDeshabilitado: { color: semantico.textoSecundario },
  mensaje: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.xs,
    marginTop: espaciado.xs,
  },
  textoError: {
    flex: 1,
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: tipografia.tamanos.cuerpo,
    color: semantico.peligro,
  },
  textoAyuda: {
    flex: 1,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.tamanos.pequeno,
    color: semantico.textoSecundario,
  },
});
