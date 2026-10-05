// Expo detecta el monorepo automáticamente (workspaces de pnpm con dependencias elevadas).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Web (demo en el navegador): módulos que solo existen en la build nativa y que el código
 * carga con require condicional (nunca se ejecutan en web). Metro resuelve los require de
 * forma estática, así que en web se sustituyen por un módulo vacío para que el bundle no
 * arrastre SQLite de Node (better-sqlite3, fs) ni MapLibre nativo.
 */
const SOLO_NATIVOS_EN_WEB = [
  /^@nozbe\/watermelondb\/adapters\/sqlite(\/.*)?$/,
  /^better-sqlite3$/,
  /^@maplibre\/maplibre-react-native(\/.*)?$/,
];

const resolverOriginal = config.resolver.resolveRequest;
config.resolver.resolveRequest = (contexto, modulo, plataforma) => {
  if (plataforma === 'web' && SOLO_NATIVOS_EN_WEB.some((re) => re.test(modulo))) {
    return { type: 'empty' };
  }
  return resolverOriginal
    ? resolverOriginal(contexto, modulo, plataforma)
    : contexto.resolveRequest(contexto, modulo, plataforma);
};

module.exports = config;
