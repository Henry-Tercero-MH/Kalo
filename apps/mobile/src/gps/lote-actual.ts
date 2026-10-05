/**
 * Lote automático: con los polígonos descargados, detecta en qué lote está el trabajador
 * (punto dentro de polígono) y lo propone en cada formulario.
 */
import { loteEnPosicion, type Fila, type PoligonoGeoJson } from '@kalo/shared';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { useConsulta } from '@/db/hooks';
import type { Ubicacion } from './ubicacion';

export type LoteConGeometria = Fila<'lotes'> & { geometria: PoligonoGeoJson };

interface EstadoPosicion {
  ubicacion: Ubicacion | null;
  fijar: (u: Ubicacion) => void;
}

export const usePosicion = create<EstadoPosicion>((set) => ({
  ubicacion: null,
  fijar: (ubicacion) => set({ ubicacion }),
}));

export function useLotes(): LoteConGeometria[] {
  const lotes = useConsulta('lotes');
  return useMemo(
    () =>
      lotes
        .map((l) => {
          try {
            return { ...l, geometria: JSON.parse(l.poligono) as PoligonoGeoJson };
          } catch {
            return null;
          }
        })
        .filter((l): l is LoteConGeometria => l !== null)
        .sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [lotes],
  );
}

/** Observa la posición en primer plano mientras la pantalla está abierta. */
export function useObservarPosicion() {
  const fijar = usePosicion((s) => s.fijar);
  const [permiso, setPermiso] = useState<boolean | null>(null);
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let activo = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!activo) return;
      setPermiso(status === 'granted');
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10_000, distanceInterval: 10 },
        (p) =>
          fijar({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            precision: p.coords.accuracy ?? 999,
            hora: p.timestamp,
          }),
      );
    })();
    return () => {
      activo = false;
      sub?.remove();
    };
  }, [fijar]);
  return permiso;
}

export function useLoteActual(): LoteConGeometria | null {
  const lotes = useLotes();
  const ubicacion = usePosicion((s) => s.ubicacion);
  return useMemo(() => {
    if (!ubicacion) return null;
    const encontrado = loteEnPosicion(
      [ubicacion.lng, ubicacion.lat],
      lotes.map((l) => ({ id: l.id, poligono: l.geometria })),
    );
    return lotes.find((l) => l.id === encontrado?.id) ?? null;
  }, [lotes, ubicacion]);
}
