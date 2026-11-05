/**
 * Tokens de diseño de Inversiones Kalo.
 *
 * Fuente única: `tokens.json` (copiado de la Guía de marca para informes).
 * Se consumen desde la app móvil (StyleSheet) y desde el panel web
 * (tema de Tailwind generado en `theme.css` con `pnpm --filter @kalo/ui-tokens build`).
 */
import tokensJson from './tokens.json';

export const colores = tokensJson;

export type Colores = typeof colores;

/** Alias semánticos según las reglas de la guía. */
export const semantico = {
  fondo: colores.neutros.n0,
  fondoSuave: colores.neutros.n50,
  titulo: colores.neutros.n900,
  texto: colores.neutros.n700,
  textoSecundario: colores.neutros.n500,
  borde: colores.neutros.n200,
  bordeFuerte: colores.marca.negro,
  acento: colores.marca.verde,
  acentoOscuro: colores.marca.verde700,
  /** Botón principal mientras se presiona (texto encima: 8,3:1). */
  acentoPresionado: colores.marca.verde600,
  /** Borde de inputs, casillas y opciones (5,4:1 sobre blanco, WCAG 1.4.11). */
  bordeControl: colores.neutros.n500,
  /** Borde de tarjetas y filas que se pueden tocar; `borde` queda para las que no. */
  bordeTocable: colores.neutros.n500,
  /** Fondo de la opción elegida (título encima: 16,4:1). */
  seleccion: colores.marca.verde100,
  /** Bloques en negro: código del trabajador, encabezado de grupo. */
  superficieInvertida: colores.marca.negro,
  /** Texto sobre el botón principal (verde): 10,7:1. */
  textoSobreAcento: colores.texto.sobreAcento,
  /** Texto sobre `superficieInvertida` o sobre colores de estado oscuros. */
  textoSobreOscuro: colores.texto.sobreOscuro,
  /** Velo detrás de diálogos y hojas inferiores. */
  velo: 'rgba(20, 19, 17, 0.55)',
  exito: colores.estados.exito,
  alerta: colores.estados.alerta,
  peligro: colores.estados.peligro,
  info: colores.estados.info,
  /** `alerta` no llega a 4,5:1 como texto: úsela solo en marcas y bordes; para texto, esta (5,8:1). */
  textoAlerta: colores.texto.alerta,
  exitoSuave: colores.estadosSuaves.exito,
  alertaSuave: colores.estadosSuaves.alerta,
  peligroSuave: colores.estadosSuaves.peligro,
  infoSuave: colores.estadosSuaves.info,
} as const;

export const tipografia = {
  familias: {
    titulo: 'Archivo_800ExtraBold',
    cuerpo: 'Archivo_400Regular',
    cuerpoMedio: 'Archivo_600SemiBold',
    portada: 'Anton_400Regular',
  },
  /** Nombres de familia para web (Google Fonts). */
  familiasWeb: {
    titulo: 'Archivo',
    cuerpo: 'Archivo',
    portada: 'Anton',
  },
  pesos: { cuerpo: '400', medio: '600', titulo: '800' },
  tamanos: {
    /** Mínimo de cuerpo en campo: 16 px. */
    cuerpo: 16,
    pequeno: 14,
    etiqueta: 12,
    subtitulo: 18,
    titulo: 22,
    tituloGrande: 28,
    portada: 40,
    /** Logotipo de la pantalla de arranque. */
    portadaGrande: 64,
  },
  /** Altura de línea por tamaño: texto corrido 22 sobre 16; ajustada para logotipos apilados. */
  alturaLinea: { cuerpo: 22, pequeno: 20, ajustada: 17 },
  /** Espaciado entre letras (pt), siempre en MAYÚSCULAS. */
  espaciadoLetras: {
    /** Títulos y botones. */
    titulo: 0.5,
    /** Marcas cortas y logotipo. */
    enfasis: 1,
    /** Etiquetas de campo (12 px). */
    etiqueta: 1.2,
    /** Códigos y PIN, para leer dígito por dígito. */
    codigo: 2,
  },
  espaciadoEtiquetas: 1.2,
  /**
   * Límite de `maxFontSizeMultiplier` cuando el sistema agranda la letra. `controles` para textos
   * dentro de alturas fijas (botones, pastillas); el texto corrido escala sin límite.
   */
  escalaMaxima: { controles: 1.3 },
} as const;

/** Tamaños de ícono (pt). `normal` es el de campo; nunca menos de `pequeno`. */
export const tamanosIcono = {
  pequeno: 18,
  mediano: 20,
  normal: 24,
  grande: 28,
  enorme: 32,
} as const;

export const espaciado = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const bordes = {
  /** Esquinas rectas en tarjetas, botones y celdas. */
  radio: 0,
  /** Campos de entrada (inputs, selects, buscador) del panel web: `rounded-campo`. */
  radioCampo: 6,
  /** Línea negra bajo encabezado y títulos de sección (2 pt). */
  lineaTitulo: 2,
  /** Divisiones secundarias en gris #e2ded7 (1 pt). */
  lineaDivision: 1,
} as const;

/** Adaptaciones para uso en campo (guantes, sol). */
export const campo = {
  /** Alto mínimo de botones y áreas táctiles. */
  alturaTactil: 56,
  tamanoIcono: tamanosIcono.normal,
} as const;

export const tokens = {
  colores,
  semantico,
  tipografia,
  tamanosIcono,
  espaciado,
  bordes,
  campo,
} as const;

export default tokens;
