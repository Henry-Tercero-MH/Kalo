import { MODULOS, type ManifiestoModulo } from '@kalo/shared';
import { redirect } from 'next/navigation';
import { perfilActual } from '@/lib/servidor';

// Etapa 1 (labores y asistencia): el panel abre en los registros de labores. Un rol sin
// registros (p. ej. bodega de materiales) abre en su primer módulo del menú.
export default async function Inicio() {
  const { perfil } = await perfilActual();
  const modulos = perfil?.modulosWeb ?? [];
  if (!perfil || modulos.includes('registros')) redirect('/registros/labores');
  const primero = (MODULOS as readonly ManifiestoModulo[])
    .filter((m) => m.rutaWeb && m.estado === 'activo' && modulos.includes(m.codigo))
    .sort((a, b) => a.orden - b.orden)[0];
  redirect(primero?.rutaWeb ?? '/registros/labores');
}
