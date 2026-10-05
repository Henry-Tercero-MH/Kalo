/**
 * Hash del PIN para inicio de sesión sin señal.
 *
 * Un PIN de 4 dígitos tiene solo 10.000 combinaciones: ningún hash lo protege por sí solo.
 * La protección real es la base local cifrada, el bloqueo tras intentos fallidos y el borrado
 * remoto del dispositivo. El hash evita guardar el PIN en claro. Ver docs/decisiones.md.
 */
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

export const PIN_ITERACIONES = 4_000;

export const esPinValido = (pin: string) => /^\d{4}$/.test(pin);

export function hashPinOffline(pin: string, salHex: string, iteraciones = PIN_ITERACIONES): string {
  return bytesToHex(
    pbkdf2(sha256, utf8ToBytes(pin), utf8ToBytes(salHex), { c: iteraciones, dkLen: 32 }),
  );
}

export function verificarPinOffline(pin: string, salHex: string, hashEsperado: string): boolean {
  return compararSeguro(hashPinOffline(pin, salHex), hashEsperado);
}

export function hashGafete(codigo: string): string {
  return bytesToHex(sha256(utf8ToBytes(codigo.trim())));
}

/** Comparación en tiempo constante. */
export function compararSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
