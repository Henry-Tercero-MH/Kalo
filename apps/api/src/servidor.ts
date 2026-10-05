/**
 * Construcción de la aplicación Fastify (sin escuchar puerto: útil para pruebas).
 */
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { VERSION_API } from '@kalo/shared';
import Fastify, { type FastifyError } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { crearClientesS3 } from './archivos/s3';
import rutasArchivos from './archivos/rutas';
import rutasAuth from './auth/rutas';
import sesion from './auth/sesion';
import type { Config } from './config';
import type { BaseDatos } from './db/cliente';
import './lib/tipos-fastify';
import rutasAdmin from './modulos/admin';
import rutasAlertas from './modulos/alertas';
import rutasCatalogos from './modulos/catalogos';
import rutasDispositivos from './modulos/dispositivos';
import rutasMapa from './modulos/mapa';
import rutasOrdenes from './modulos/ordenes';
import rutasPronostico from './modulos/pronostico';
import rutasRegistros from './modulos/registros';
import rutasRespaldos from './modulos/respaldos';
import rutasTrampasQr from './modulos/trampas-qr';
import rutasValidacion from './modulos/validacion';
import rutasSync from './sync/rutas';

export async function construirServidor(config: Config, db: BaseDatos) {
  const app = Fastify({
    logger:
      config.NODE_ENV === 'test'
        ? false
        : {
            level: config.LOG_LEVEL,
            ...(config.NODE_ENV === 'development'
              ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } } }
              : {}),
          },
    bodyLimit: 5 * 1024 * 1024,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate('db', db);
  app.decorate('config', config);
  app.decorate('s3', crearClientesS3(config));

  await app.register(sensible);
  await app.register(cors, {
    origin: config.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  });
  await app.register(rateLimit, { global: false });
  await app.register(jwt, { secret: config.JWT_SECRET });
  await app.register(sesion);

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Kalo Campo API',
        description:
          'API de la plataforma de datos de campo de Inversiones Kalo (DEMO). Sincronización offline-first compatible con WatermelonDB.',
        version: '0.1.0',
      },
      components: {
        securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      },
      security: [{ bearer: [] }],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.setErrorHandler((error: FastifyError, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: 'Datos inválidos',
        detalles: error.validation.map((v) => ({ campo: v.instancePath, mensaje: v.message })),
      });
    }
    const status = error.statusCode ?? 500;
    if (status >= 500) req.log.error(error);
    return reply.status(status).send({
      error: status >= 500 ? 'Error interno del servidor' : error.message,
      codigo: (error as { codigo?: string }).codigo ?? error.code,
    });
  });

  app.get('/salud', { schema: { hide: true } }, async () => ({ ok: true, version: VERSION_API }));

  const v = `/${VERSION_API}`;
  await app.register(rutasAuth, { prefix: `${v}/auth` });
  await app.register(rutasDispositivos, { prefix: `${v}/dispositivos` });
  await app.register(rutasSync, { prefix: `${v}/sync` });
  await app.register(rutasArchivos, { prefix: `${v}/archivos` });
  await app.register(rutasCatalogos, { prefix: `${v}/catalogos` });
  await app.register(rutasRegistros, { prefix: `${v}/registros` });
  await app.register(rutasValidacion, { prefix: `${v}/validacion` });
  await app.register(rutasAlertas, { prefix: `${v}/alertas` });
  await app.register(rutasPronostico, { prefix: `${v}/pronostico` });
  await app.register(rutasMapa, { prefix: `${v}/mapa` });
  await app.register(rutasOrdenes, { prefix: `${v}/ordenes` });
  await app.register(rutasAdmin, { prefix: `${v}/admin` });
  await app.register(rutasTrampasQr, { prefix: `${v}/trampas` });
  await app.register(rutasRespaldos, { prefix: `${v}/respaldos` });

  return app;
}
