/**
 * Configuración por variables de entorno, validada al arrancar.
 */
import { z } from 'zod';

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url().default('postgres://kalo:kalo_demo@localhost:5432/kalo_campo'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DIAS: z.coerce.number().int().positive().default(30),
  /** Los celulares pueden pasar semanas sin señal: su sesión de dispositivo dura más. */
  JWT_DISPOSITIVO_TTL_DIAS: z.coerce.number().int().positive().default(180),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_PUBLIC_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY: z.string().default('kalo'),
  S3_SECRET_KEY: z.string().default('kalo_demo_secret'),
  S3_BUCKET: z.string().default('kalo-campo'),
  S3_REGION: z.string().default('us-east-1'),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
});

export type Config = z.infer<typeof esquema>;

export function cargarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const r = esquema.safeParse(env);
  if (!r.success) {
    const detalle = r.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(
      `Configuración inválida:\n${detalle}\nRevise el archivo .env (vea .env.example).`,
    );
  }
  return r.data;
}
