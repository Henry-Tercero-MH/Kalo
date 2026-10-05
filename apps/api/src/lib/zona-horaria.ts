/**
 * Zona horaria de la finca. Semanas, fechas y cobertura se calculan en hora de Guatemala
 * aunque el servidor esté en UTC. Debe importarse antes que cualquier otro módulo.
 */
process.env.TZ = process.env.ZONA_HORARIA ?? 'America/Guatemala';

export const ZONA_HORARIA = process.env.TZ;
