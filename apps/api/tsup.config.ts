import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/db/migrar.ts', 'src/db/seed/index.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // El paquete compartido se publica como TypeScript: se incluye en el bundle.
  noExternal: [/^@kalo\//],
});
