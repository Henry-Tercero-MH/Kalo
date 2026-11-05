'use client';

import { esquemaDefinicionFormulario, TIPOS_CAMPO, type DefinicionFormulario } from '@kalo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Aviso, Boton, Campo, claseControlCompacto, Selector, Subtitulo } from '@/componentes/ui';
import { api } from '@/lib/api';

interface FilaFormulario {
  id: string;
  codigo: string;
  version: number;
  titulo: string;
  definicion: DefinicionFormulario;
  activo: boolean;
}

export function Formularios() {
  const cliente = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin', 'formularios'],
    queryFn: () => api<FilaFormulario[]>('/admin/formularios'),
  });
  const activo = useMemo(
    () => data?.find((f) => f.activo && f.codigo === 'muestreo_plagas'),
    [data],
  );
  const [campo, setCampo] = useState({
    id: '',
    etiqueta: '',
    tipo: 'entero',
    requerido: false,
    min: '',
    max: '',
  });
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const publicar = useMutation({
    mutationFn: (d: Omit<DefinicionFormulario, 'version'>) =>
      api<{ version: number }>('/admin/formularios', { method: 'POST', body: d }),
    onSuccess: () => {
      setError(null);
      setTexto('');
      return cliente.invalidateQueries({ queryKey: ['admin', 'formularios'] });
    },
    onError: (e) => setError((e as Error).message),
  });
  if (!data) return null;
  return (
    <>
      <Subtitulo>Formularios dinámicos</Subtitulo>
      <p className="mb-3 text-sm">
        Agregar un campo publica una versión nueva del formulario; llega a los celulares al
        sincronizar, sin actualizar la app. Cada registro guarda la versión con que se creó.
      </p>
      {activo ? (
        <>
          <p className="mb-2 text-sm">
            <b className="uppercase">{activo.titulo}</b> · versión activa {activo.version} ·{' '}
            {activo.definicion.campos.length} campos
          </p>
          <ol className="mb-4 list-inside list-decimal text-sm">
            {activo.definicion.campos.map((c) => (
              <li key={c.id}>
                {c.etiqueta}{' '}
                <code className="text-neutros-n500">
                  ({c.id}, {c.tipo}
                  {c.requerido ? ', obligatorio' : ''}
                  {c.visibleSi ? `, si ${c.visibleSi.campo}` : ''})
                </code>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-end gap-3">
            <Campo
              etiqueta="Id del campo"
              placeholder="hojas_funcionales"
              value={campo.id}
              onChange={(e) => setCampo({ ...campo, id: e.target.value })}
            />
            <Campo
              etiqueta="Pregunta"
              value={campo.etiqueta}
              onChange={(e) => setCampo({ ...campo, etiqueta: e.target.value })}
            />
            <Selector
              etiqueta="Tipo"
              value={campo.tipo}
              onChange={(e) => setCampo({ ...campo, tipo: e.target.value })}
            >
              {TIPOS_CAMPO.filter((t) => !['opcion', 'multiopcion'].includes(t)).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Selector>
            <Campo
              etiqueta="Mín."
              type="number"
              value={campo.min}
              onChange={(e) => setCampo({ ...campo, min: e.target.value })}
              className="w-20"
            />
            <Campo
              etiqueta="Máx."
              type="number"
              value={campo.max}
              onChange={(e) => setCampo({ ...campo, max: e.target.value })}
              className="w-20"
            />
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="h-5 w-5 accent-marca-negro"
                checked={campo.requerido}
                onChange={(e) => setCampo({ ...campo, requerido: e.target.checked })}
              />{' '}
              Obligatorio
            </label>
            <Boton
              disabled={!campo.id || !campo.etiqueta || publicar.isPending}
              onClick={() => {
                const nuevo = {
                  id: campo.id,
                  etiqueta: campo.etiqueta,
                  tipo: campo.tipo,
                  requerido: campo.requerido,
                  ...(campo.min !== '' ? { min: Number(campo.min) } : {}),
                  ...(campo.max !== '' ? { max: Number(campo.max) } : {}),
                };
                const { version: _v, ...resto } = activo.definicion;
                publicar.mutate({
                  ...resto,
                  campos: [...activo.definicion.campos, nuevo],
                } as never);
              }}
            >
              Agregar campo y publicar
            </Boton>
          </div>
        </>
      ) : null}
      <details className="mt-4">
        <summary className="cursor-pointer py-2 text-sm font-semibold uppercase hover:text-neutros-n900">
          Editar definición completa (JSON)
        </summary>
        <textarea
          className={`mb-3 mt-2 h-64 w-full p-2 font-mono ${claseControlCompacto}`}
          value={texto || JSON.stringify(activo?.definicion ?? {}, null, 2)}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Definición del formulario en JSON"
        />
        <Boton
          variante="secundario"
          onClick={() => {
            try {
              const d = esquemaDefinicionFormulario.parse({
                ...JSON.parse(texto || JSON.stringify(activo?.definicion)),
                version: 1,
              });
              const { version: _v, ...resto } = d;
              publicar.mutate(resto);
            } catch (e) {
              setError(`Definición inválida: ${(e as Error).message}`);
            }
          }}
        >
          Publicar versión nueva
        </Boton>
      </details>
      {error ? <Aviso tipo="peligro">{error}</Aviso> : null}
      {publicar.isSuccess ? (
        <Aviso tipo="exito">Versión {publicar.data.version} publicada.</Aviso>
      ) : null}
    </>
  );
}
