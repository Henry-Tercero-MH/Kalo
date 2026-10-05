/**
 * Utilidades comunes de los módulos: confirmar guardado y disparar la sincronización.
 */
import { tienePermiso } from '@kalo/shared';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { avisar } from '@/componentes/alerta';
import i18n from '@/i18n';
import { useSesion } from '@/permisos/sesion';
import { sincronizar } from '@/sync/motor';

/** Tras guardar: aviso claro (funciona sin señal) y sincronización en segundo plano. */
export function despuesDeGuardar(volver: () => void, mensaje = i18n.t('comun.guardadoLocal')) {
  void sincronizar('registro');
  avisar(i18n.t('comun.listo'), mensaje, volver);
}

/** Si el usuario no tiene el permiso, vuelve atrás (defensa además del menú). */
export function useRequierePermiso(permiso: string) {
  const router = useRouter();
  const permisos = useSesion((s) => s.permisos);
  const permitido = tienePermiso(permisos, permiso);
  useEffect(() => {
    if (!permitido) router.back();
  }, [permitido, router]);
  return permitido;
}
