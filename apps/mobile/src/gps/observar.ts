/**
 * Observar la posición en primer plano (con la app abierta).
 *
 *  - Android / iOS (también Expo Go): Location.watchPositionAsync.
 *  - Web: navigator.geolocation.watchPosition directamente. El watchPositionAsync de
 *    expo-location en web emite los eventos con el id del navegador en lugar del id del
 *    suscriptor, así que la devolución de llamada puede no ejecutarse nunca; además no
 *    aplica timeInterval ni distanceInterval. Aquí se aplican ambos a mano.
 */
import { distanciaMetros } from '@kalo/shared';
import * as Location from 'expo-location';
import { esWeb } from '@/demo/entorno';

export interface OpcionesObservar {
  accuracy: Location.Accuracy;
  /** ms mínimos entre posiciones. */
  timeInterval?: number;
  /** metros mínimos entre posiciones. */
  distanceInterval?: number;
}

export interface Observador {
  remove: () => void;
}

export async function observarPosicion(
  opciones: OpcionesObservar,
  alRecibir: (p: Location.LocationObject) => void,
): Promise<Observador> {
  if (!esWeb) return Location.watchPositionAsync(opciones, alRecibir);

  const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
  if (!geo) throw new Error('Este navegador no permite conocer la ubicación.');
  let ultima: Location.LocationObject | null = null;
  const id = geo.watchPosition(
    (pos) => {
      const p: Location.LocationObject = {
        timestamp: pos.timestamp,
        coords: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        },
      };
      if (ultima) {
        const dt = p.timestamp - ultima.timestamp;
        const dist = distanciaMetros(
          [ultima.coords.longitude, ultima.coords.latitude],
          [p.coords.longitude, p.coords.latitude],
        );
        if (dt < (opciones.timeInterval ?? 0) || dist < (opciones.distanceInterval ?? 0)) return;
      }
      ultima = p;
      alRecibir(p);
    },
    (e) => {
      // Los tiempos de espera son normales (sin cambio de posición); solo se avisa el permiso.
      if (e.code === e.PERMISSION_DENIED) console.warn('Ubicación del navegador denegada');
    },
    {
      enableHighAccuracy: opciones.accuracy > Location.Accuracy.Balanced,
      maximumAge: 5_000,
      timeout: 60_000,
    },
  );
  return { remove: () => geo.clearWatch(id) };
}
