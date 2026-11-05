/**
 * Componentes base con la guía de marca: títulos en Archivo 800 MAYÚSCULAS con línea
 * negra de 2 pt, botones rectos (principal verde con texto oscuro, secundario borde negro),
 * estados con color + palabra, muestras de color de cinta con su nombre.
 *
 * Accesibilidad: cada campo tiene <label htmlFor> visible, foco con borde negro de 2 pt
 * (outline sobre el borde), error con borde y mensaje en peligro enlazado por
 * aria-describedby, y alto mínimo de 40 px en botones y controles (panel de oficina).
 */
export * from './acciones';
export * from './campos';
export * from './estado';
export * from './marca';
export * from './texto';
