/**
 * Punto de entrada de la API.
 */
import * as Sentry from '@sentry/node';
import { cargarConfig } from './config';
import { crearBaseDatos } from './db/cliente';
import { construirServidor } from './servidor';

const config = cargarConfig();
if (config.SENTRY_DSN) Sentry.init({ dsn: config.SENTRY_DSN, environment: config.NODE_ENV });

const { db, cliente } = crearBaseDatos(config.DATABASE_URL);
const app = await construirServidor(config, db);

const cerrar = async () => {
  await app.close();
  await cliente.end();
  process.exit(0);
};
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);

await app.listen({ port: config.API_PORT, host: config.API_HOST });
app.log.info(`Documentación en http://localhost:${config.API_PORT}/docs`);
