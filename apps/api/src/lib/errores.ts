/** Errores HTTP con mensajes en español. */
export class ErrorHttp extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public codigo?: string,
  ) {
    super(message);
  }
}

export const noAutorizado = (m = 'Sesión inválida o vencida') =>
  new ErrorHttp(401, m, 'NO_AUTORIZADO');
export const prohibido = (m = 'No tiene permiso para esta acción') =>
  new ErrorHttp(403, m, 'PROHIBIDO');
export const noEncontrado = (m = 'No encontrado') => new ErrorHttp(404, m, 'NO_ENCONTRADO');
export const solicitudInvalida = (m: string) => new ErrorHttp(400, m, 'SOLICITUD_INVALIDA');
