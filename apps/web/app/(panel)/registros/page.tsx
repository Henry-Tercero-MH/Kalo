'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Cargando, Titulo } from '@/componentes/ui';
import { api } from '@/lib/api';

export default function Registros() {
  const { data } = useQuery({ queryKey: ['registros'], queryFn: () => api<{ tabla: string; etiqueta: string }[]>('/registros') });
  return (
    <>
      <Titulo>Registros</Titulo>
      {!data ? <Cargando /> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {data?.map((t) => (
          <Link key={t.tabla} href={`/registros/${t.tabla}`} className="flex min-h-16 items-center border border-neutros-n200 px-4 font-extrabold uppercase text-neutros-n900 hover:border-marca-negro">
            {t.etiqueta}
          </Link>
        ))}
      </div>
    </>
  );
}
