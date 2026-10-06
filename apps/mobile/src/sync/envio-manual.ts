/**
 * Envío manual: con él activo, los disparadores automáticos (al abrir, al volver la señal,
 * cada N minutos, al guardar) no envían nada; los datos salen solo con «Enviar datos».
 * Lo usa el perfil de caporal, que revisa lo tomado sin señal antes de enviarlo.
 */
let manual = false;

export function fijarEnvioManual(valor: boolean) {
  manual = valor;
}

export function esEnvioManual(): boolean {
  return manual;
}
