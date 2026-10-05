import type { S3Client } from '@aws-sdk/client-s3';
import type { Config } from '../config';
import type { BaseDatos } from '../db/cliente';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  usuario: string;
  fincaId: string;
  empresaId: string;
  rolId: string;
  rol: string;
  /** Plataformas que el rol puede usar ('web', 'movil'). */
  plataformas: string[];
  permisos: Set<string>;
}

export interface DispositivoSesion {
  id: string;
  fincaId: string;
  empresaId: string;
  estado: string;
}

export interface CargaJwt {
  sub: string;
  typ: 'usuario' | 'dispositivo';
}

declare module 'fastify' {
  interface FastifyInstance {
    db: BaseDatos;
    config: Config;
    s3: { cliente: S3Client; publico: S3Client; bucket: string };
    autenticarUsuario: (req: FastifyRequest) => Promise<void>;
    autenticarDispositivo: (req: FastifyRequest) => Promise<void>;
    requiere: (...permisos: string[]) => (req: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    usuario?: UsuarioSesion;
    dispositivo?: DispositivoSesion;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: CargaJwt;
    user: CargaJwt;
  }
}

export {};
