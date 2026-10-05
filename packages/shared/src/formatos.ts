/**
 * Formato de números según la guía de marca: punto para miles y coma para decimales,
 * siempre con unidad y periodo (p. ej. «3.974 cajas/ha/año»).
 */

export function formatearNumero(valor: number | null | undefined, decimales = 0): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  const negativo = valor < 0;
  const fijo = Math.abs(valor).toFixed(decimales);
  const [entero, fraccion] = fijo.split('.');
  const conMiles = entero!.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}${conMiles}${fraccion ? `,${fraccion}` : ''}`;
}

export function formatearConUnidad(
  valor: number | null | undefined,
  unidad: string,
  decimales = 0,
): string {
  return `${formatearNumero(valor, decimales)} ${unidad}`;
}

export function formatearPorcentaje(valor: number | null | undefined, decimales = 1): string {
  return `${formatearNumero(valor, decimales)} %`;
}

/** Fecha y hora local legible: 05/10/2026 14:30. */
export function formatearFechaHora(ms: number | null | undefined): string {
  if (!ms) return '—';
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** AAAA-MM-DD → DD/MM/AAAA. */
export function formatearFecha(fechaIso: string | null | undefined): string {
  if (!fechaIso) return '—';
  const [a, m, d] = fechaIso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}
