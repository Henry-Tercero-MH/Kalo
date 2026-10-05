import {
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Config } from '../config';

export function crearClientesS3(config: Config) {
  const base = {
    region: config.S3_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY },
  };
  return {
    cliente: new S3Client({ ...base, endpoint: config.S3_ENDPOINT }),
    // Las URL prefirmadas deben usar la dirección que alcanzan el celular y el navegador.
    publico: new S3Client({ ...base, endpoint: config.S3_PUBLIC_ENDPOINT ?? config.S3_ENDPOINT }),
    bucket: config.S3_BUCKET,
  };
}

type Clientes = ReturnType<typeof crearClientesS3>;

export function urlSubida(s3: Clientes, clave: string, mime: string) {
  return getSignedUrl(
    s3.publico,
    new PutObjectCommand({ Bucket: s3.bucket, Key: clave, ContentType: mime }),
    {
      expiresIn: 900,
    },
  );
}

export function urlDescarga(s3: Clientes, clave: string) {
  return getSignedUrl(s3.publico, new GetObjectCommand({ Bucket: s3.bucket, Key: clave }), {
    expiresIn: 900,
  });
}

export async function existeObjeto(s3: Clientes, clave: string): Promise<number | null> {
  try {
    const r = await s3.cliente.send(new HeadObjectCommand({ Bucket: s3.bucket, Key: clave }));
    return r.ContentLength ?? 0;
  } catch {
    return null;
  }
}
