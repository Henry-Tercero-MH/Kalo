import * as Crypto from 'expo-crypto';

/** UUID v4 generado en el dispositivo (los registros se crean sin servidor). */
export const nuevoId = (): string => Crypto.randomUUID();
