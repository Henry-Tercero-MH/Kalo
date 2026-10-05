import { useEffect, useState } from 'react';
import type { ContextoEscritura } from '@/db/repositorio';
import { almacen, type ConfiguracionDispositivo } from '@/utils/almacen-seguro';
import { useSesion } from './sesion';

let configuracionEnMemoria: ConfiguracionDispositivo | null = null;

export async function cargarConfiguracion() {
  configuracionEnMemoria = await almacen.configuracion();
  return configuracionEnMemoria;
}

export function useConfiguracion(): ConfiguracionDispositivo | null {
  const [c, setC] = useState(configuracionEnMemoria);
  useEffect(() => {
    if (!c) void cargarConfiguracion().then(setC);
  }, [c]);
  return c;
}

/** Usuario + finca + dispositivo con que se firma cada registro. */
export function useContextoEscritura(): ContextoEscritura | null {
  const usuario = useSesion((s) => s.usuario);
  const config = useConfiguracion();
  if (!usuario || !config) return null;
  return { usuarioId: usuario.id, fincaId: config.fincaId, dispositivoId: config.dispositivoId };
}
