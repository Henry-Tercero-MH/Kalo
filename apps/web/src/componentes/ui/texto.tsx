/** Títulos, subtítulos y etiquetas. */
import { type ReactNode } from 'react';

export function Titulo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-marca-negro pb-2">
      <h1 className="text-2xl">{children}</h1>
      {accion}
    </div>
  );
}

export function Subtitulo({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-8 border-b-2 border-marca-negro pb-1 text-base">{children}</h2>;
}

const claseEtiqueta = 'text-xs font-semibold uppercase tracking-[0.12em] text-neutros-n500';

/** Con `htmlFor` se dibuja como <label> asociado al control; sin él, como texto. */
export function Etiqueta({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={claseEtiqueta}>
        {children}
      </label>
    );
  }
  return <span className={claseEtiqueta}>{children}</span>;
}
