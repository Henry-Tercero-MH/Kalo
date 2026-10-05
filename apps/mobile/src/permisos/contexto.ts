import { useEffect, useState } from 'react';
import type { ContextoEscritura } from '@/db/repositorio';
import { fijarModoDemo } from '@/demo/modo';
import { almacen, type ConfiguracionDispositivo } from '@/utils/almacen-seguro';
import { useSesion } from './sesion';

let configuracionEnMemoria: ConfiguracionDispositivo | null = null;

export async function cargarConfiguracion() {
  const [config, demo] = await Promise.all([almacen.configuracion(), almacen.modoDemo()]);
  configuracionEnMemoria = config;
  fijarModoDemo(Boolean(config) && demo);
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
