'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Aviso, Boton, Campo, Logo } from '@/componentes/ui';

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setCargando(true);
        setError(null);
        const r = await fetch('/api/sesion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario, pin }),
        });
        setCargando(false);
        if (!r.ok) {
          const d = (await r.json().catch(() => ({}))) as { error?: string };
          return setError(d.error ?? 'No se pudo iniciar sesión');
        }
        const volver = params.get('volver');
        router.replace(volver && volver.startsWith('/') ? volver : '/mapa');
        router.refresh();
      }}
    >
      <Campo
        etiqueta="Usuario"
        value={usuario}
        onChange={(e) => setUsuario(e.target.value)}
        autoComplete="username"
        required
      />
      <Campo
        etiqueta="PIN"
        type="password"
        inputMode="numeric"
        maxLength={4}
        pattern="\d{4}"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        autoComplete="current-password"
        required
      />
      {error ? <Aviso tipo="peligro">{error}</Aviso> : null}
      <Boton type="submit" disabled={cargando}>
        {cargando ? 'Entrando…' : 'Entrar'}
      </Boton>
    </form>
  );
}

export default function Login() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Logo />
      <h1 className="mt-8 border-b-2 border-marca-negro pb-2 text-2xl">Panel de campo</h1>
      <p className="my-4 text-sm text-neutros-n500">
        Ingrese con su usuario y PIN. Datos de demostración marcados como DEMO.
      </p>
      <Suspense>
        <Formulario />
      </Suspense>
    </main>
  );
}
