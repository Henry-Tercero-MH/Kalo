import type { EstadoOrden } from '@kalo/shared';
import { actualizar } from '@/db/repositorio';

export const cambiarEstadoOrden = (id: string, estado: EstadoOrden) =>
  actualizar('ordenes_trabajo', id, { estado });
