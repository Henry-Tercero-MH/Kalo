'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { Aviso, Boton, Campo } from '@/componentes/ui';

const ID_USUARIO = 'sesion-usuario';
const ID_PIN = 'sesion-pin';
const ID_ENVIAR = 'sesion-enviar';
const ID_ERROR = 'sesion-error';

/**
 * Tipo de fallo, para dar un mensaje distinto y devolver el foco al lugar donde se corrige:
 * datos (usuario o PIN) → PIN; rol sin panel web → usuario; red o servidor → botón (reintentar).
 */
type Fallo = { mensaje: string; campos: boolean; foco: string };

function falloPorEstado(status: number, mensajeServidor: string | undefined): Fallo {
  if (status === 400)
    return {
      mensaje: 'Escriba su usuario y un PIN de 4 números.',
      campos: true,
      foco: ID_USUARIO,
    };
  if (status === 401)
    return {
      mensaje: 'El usuario o el PIN no coinciden. Revíselos e intente de nuevo.',
      campos: true,
      foco: ID_PIN,
    };
  if (status === 403)
    return {
      mensaje: `${mensajeServidor ?? 'Su rol no tiene acceso al panel web.'} Use la app Kalo Campo en el celular.`,
      campos: false,
      foco: ID_USUARIO,
    };
  if (status === 429)
    return {
      mensaje: 'Demasiados intentos seguidos. Espere un minuto e intente de nuevo.',
      campos: false,
      foco: ID_ENVIAR,
    };
  return {
    mensaje: 'El servidor no respondió. Intente de nuevo en un momento.',
    campos: false,
    foco: ID_ENVIAR,
  };
}

const FALLO_RED: Fallo = {
  mensaje: 'No hay conexión con el servidor. Revise la red e intente de nuevo.',
  campos: false,
  foco: ID_ENVIAR,
};

export function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [fallo, setFallo] = useState<Fallo | null>(null);
  const [cargando, setCargando] = useState(false);
  // Evita el doble envío aunque el estado aún no se haya vuelto a pintar.
  const enviando = useRef(false);

  function mostrarFallo(f: Fallo) {
    enviando.current = false;
    setCargando(false);
    if (f.campos && f.foco === ID_PIN) setPin('');
    setFallo(f);
    // Tras pintar: el botón vuelve a estar habilitado y el campo listo para recibir foco.
    requestAnimationFrame(() => document.getElementById(f.foco)?.focus());
  }

  const describe = fallo?.campos ? ID_ERROR : undefined;

  return (
    <form
      className="flex flex-col gap-4"
      aria-label="Iniciar sesión"
      onSubmit={async (e) => {
        e.preventDefault();
        if (enviando.current) return;
        enviando.current = true;
        setCargando(true);
        setFallo(null);
        let r: Response;
        try {
          r = await fetch('/api/sesion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, pin }),
          });
        } catch {
          return mostrarFallo(FALLO_RED);
        }
        if (!r.ok) {
          const d = (await r.json().catch(() => ({}))) as { error?: string };
          return mostrarFallo(falloPorEstado(r.status, d.error));
        }
        // Se queda en «Entrando…» hasta que cambia la página.
        const volver = params.get('volver');
        router.replace(volver && volver.startsWith('/') ? volver : '/');
        router.refresh();
      }}
    >
      <Campo
        id={ID_USUARIO}
        name="usuario"
        etiqueta="Usuario"
        tamano="grande"
        value={usuario}
        onChange={(e) => setUsuario(e.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        required
        aria-invalid={fallo?.campos ? true : undefined}
        aria-describedby={describe}
      />
      <Campo
        id={ID_PIN}
        name="pin"
        etiqueta="PIN (4 dígitos)"
        tamano="grande"
        type="password"
        inputMode="numeric"
        maxLength={4}
        pattern="\d{4}"
        title="4 números"
        value={pin}
        // Solo números: con el PIN oculto no se vería una letra escrita por error.
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        autoComplete="current-password"
        required
        aria-invalid={fallo?.campos ? true : undefined}
        aria-describedby={describe}
      />
      {fallo ? (
        <Aviso tipo="peligro" id={ID_ERROR}>
          {fallo.mensaje}
        </Aviso>
      ) : null}
      <Boton id={ID_ENVIAR} type="submit" tamano="grande" cargando={cargando} className="w-full">
        {cargando ? 'Entrando…' : 'Entrar'}
      </Boton>
    </form>
  );
}
