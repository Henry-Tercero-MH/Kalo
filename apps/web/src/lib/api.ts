/**
 * Cliente de la API para componentes de cliente (pasa por el proxy /api/v1).
 */
export class ErrorApi extends Error {
  constructor(
    public estado: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  ruta: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const r = await fetch(`/api/v1${ruta}`, {
    method: init.method ?? 'GET',
    headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (r.status === 401 && typeof window !== 'undefined') {
    window.location.href = `/login?volver=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { error?: string };
    throw new ErrorApi(r.status, e.error ?? `Error ${r.status}`);
  }
  return (await r.json()) as T;
}

export function query(params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}
