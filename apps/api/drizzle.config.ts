import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/esquema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://kalo:kalo_demo@localhost:5432/kalo_campo',
  },
  extensionsFilters: ['postgis'],
  strict: true,
  verbose: true,
});
