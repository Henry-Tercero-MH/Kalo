// Genera los íconos de la app (instalada y PWA) con el logo oficial sobre fondo blanco.
// No redibuja el logo: solo lo centra y escala. Uso: pnpm --filter @kalo/mobile marca:iconos
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const logo = join(app, 'assets', 'kalo-logo.png');
const BLANCO = { r: 255, g: 255, b: 255, alpha: 1 };

/**
 * Lienzo cuadrado blanco con el logo centrado.
 * `ancho` es la fracción del lado que ocupa el logo (los íconos «maskable» y el adaptativo de
 * Android recortan los bordes, por eso llevan el logo más pequeño).
 */
async function icono(destino, lado, ancho) {
  const anchoLogo = Math.round(lado * ancho);
  const logoEscalado = await sharp(logo).resize({ width: anchoLogo }).png().toBuffer();
  mkdirSync(dirname(destino), { recursive: true });
  await sharp({ create: { width: lado, height: lado, channels: 4, background: BLANCO } })
    .composite([{ input: logoEscalado, gravity: 'center' }])
    .flatten({ background: BLANCO })
    .png({ compressionLevel: 9 })
    .toFile(destino);
  console.info(`${destino.replace(app + '/', '')} (${lado}×${lado})`);
}

// App instalada (Android / iOS).
await icono(join(app, 'assets', 'icono.png'), 1024, 0.8);
// Android adaptativo: el sistema recorta a círculo o gota; zona segura ≈ 66 % del centro.
await icono(join(app, 'assets', 'icono-adaptativo.png'), 1024, 0.6);
// PWA (navegador del celular) y pestaña.
await icono(join(app, 'public', 'icono-192.png'), 192, 0.8);
await icono(join(app, 'public', 'icono-512.png'), 512, 0.8);
await icono(join(app, 'public', 'icono-512-maskable.png'), 512, 0.6);
await icono(join(app, 'public', 'apple-touch-icon.png'), 180, 0.8);
await icono(join(app, 'public', 'favicon.png'), 64, 0.92);
