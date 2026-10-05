/**
 * Ubicación actual con hora del GPS (hora confiable) y precisión.
 * Funciona en la build nativa, en Expo Go y en el navegador (geolocalización del navegador).
 */
import * as Location from 'expo-location';

export interface Ubicacion {
  lat: number;
  lng: number;
  precision: number;
  /** Hora reportada por el GPS (ms). */
  hora: number;
}

export async function pedirPermisoUbicacion(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    // Navegador sin geolocalización (o página sin HTTPS): se guarda sin ubicación.
    return false;
  }
}

/** Ubicación actual; si tarda, usa la última conocida. Nunca bloquea el guardado. */
export async function obtenerUbicacion(tiempoMaximo = 12_000): Promise<Ubicacion | null> {
  if (!(await pedirPermisoUbicacion())) return null;
  const aUbicacion = (p: Location.LocationObject): Ubicacion => ({
    lat: p.coords.latitude,
    lng: p.coords.longitude,
    precision: p.coords.accuracy ?? 999,
    hora: p.timestamp,
  });
  try {
    const actual = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((ok) => setTimeout(() => ok(null), tiempoMaximo)),
    ]);
    if (actual) return aUbicacion(actual);
  } catch {
    // continúa con la última conocida
  }
  try {
    const ultima = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
    return ultima ? aUbicacion(ultima) : null;
  } catch {
    return null;
  }
}

/** Columnas GPS de un registro a partir de la ubicación. */
export function columnasGps(u: Ubicacion | null) {
  return {
    lat: u?.lat ?? null,
    lng: u?.lng ?? null,
    precision_gps: u ? Math.round(u.precision * 10) / 10 : null,
    hora_gps: u?.hora ?? null,
  };
}
