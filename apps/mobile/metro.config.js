// Expo detecta el monorepo automáticamente (workspaces de pnpm con dependencias elevadas).
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
