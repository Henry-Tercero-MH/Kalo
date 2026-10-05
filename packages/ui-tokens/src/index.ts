/**
 * Tokens de diseño de Inversiones Kalo.
 *
 * Fuente única: `tokens.json` (copiado de la Guía de marca para informes).
 * Se consumen desde la app móvil (StyleSheet) y desde el panel web
 * (tema de Tailwind generado en `theme.css` con `pnpm --filter @kalo/ui-tokens build`).
 *
 * Nota: el prompt original trae `verde600` como `#8bb31` (5 dígitos). Se completó como
 * `#8bb331` y queda PENDIENTE confirmarlo contra el PDF de la guía (ver docs/decisiones.md).
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
  /** Texto sobre el botón principal (verde). */
  textoSobreAcento: '#111111',
  exito: colores.estados.exito,
  alerta: colores.estados.alerta,
  peligro: colores.estados.peligro,
  info: colores.estados.info,
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
  },
  espaciadoEtiquetas: 1.2,
} as const;

export const espaciado = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const bordes = {
  /** Esquinas rectas en tarjetas, botones, campos y celdas. */
  radio: 0,
  /** Línea negra bajo encabezado y títulos de sección (2 pt). */
  lineaTitulo: 2,
  /** Divisiones secundarias en gris #e2ded7 (1 pt). */
  lineaDivision: 1,
} as const;

/** Adaptaciones para uso en campo (guantes, sol). */
export const campo = {
  /** Alto mínimo de botones y áreas táctiles. */
  alturaTactil: 56,
  tamanoIcono: 24,
} as const;

export const tokens = { colores, semantico, tipografia, espaciado, bordes, campo } as const;

export default tokens;
