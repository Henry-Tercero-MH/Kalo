'use client';

/** Parámetros editables, feature flags por módulo, formularios dinámicos y bitácora. */
import {
  esquemaDefinicionFormulario,
  formatearFechaHora,
  MODULOS,
  TIPOS_CAMPO,
  type DefinicionFormulario,
} from '@kalo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Aviso, Boton, Campo, Estado, Selector, Subtitulo } from '@/componentes/ui';
import { api } from '@/lib/api';
import { useCatalogos, useNombres } from '@/lib/catalogos';

const th = 'px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-neutros-n500';

export function Parametros() {
  const { data } = useCatalogos();
  const cliente = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const guardar = useMutation({
    mutationFn: (v: { id: string; valor: unknown }) => api(`/admin/parametros/${v.id}`, { method: 'PATCH', body: { valor: v.valor } }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['catalogos'] }),
  });
  return (
    <>
      <Subtitulo>Parámetros</Subtitulo>
      <p className="mb-3 text-sm">Umbrales, intervalos de GPS, tamaño de celda de cobertura, factores: nada fijo en el código. Valores en JSON.</p>
      {error ? <Aviso tipo="peligro">{error}</Aviso> : null}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-marca-negro">
            <th className={th}>Parámetro</th>
            <th className={th}>Valor</th>
            <th className={th}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {data?.parametros
            .slice()
            .sort((a, b) => a.clave.localeCompare(b.clave))
            .map((p) => (
              <tr key={p.id} className="border-b border-neutros-n200 align-top">
                <td className="px-2 py-2">
                  <code className="font-semibold">{p.clave}</code>
                  <p className="text-neutros-n500">{p.descripcion}</p>
                </td>
                <td className="px-2 py-2">
                  <textarea
                    className="w-full min-w-64 border border-neutros-n300 px-2 py-1 font-mono text-xs"
                    rows={typeof p.valor === 'object' ? 3 : 1}
                    defaultValue={JSON.stringify(p.valor)}
                    aria-label={`Valor de ${p.clave}`}
                    onBlur={(e) => {
                      try {
                        const valor = JSON.parse(e.target.value);
                        setError(null);
                        if (JSON.stringify(valor) !== JSON.stringify(p.valor)) guardar.mutate({ id: p.id, valor });
                      } catch {
                        setError(`JSON inválido en ${p.clave}`);
                      }
                    }}
                  />
                </td>
                <td className="px-2 py-2">{p.pendiente ? <Estado tipo="alerta" texto="Pendiente" /> : <Estado tipo="exito" texto="Definido" />}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}

export function Modulos() {
  const { data } = useCatalogos();
  const cliente = useQueryClient();
  const cambiar = useMutation({
    mutationFn: (v: { codigo: string; activo: boolean }) => api('/admin/feature-flags', { method: 'PUT', body: v }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['catalogos'] }),
  });
  const inactivos = new Set((data?.flags ?? []).filter((f) => !f.activo && !f.rol_id).map((f) => f.codigo));
  return (
    <>
      <Subtitulo>Módulos (feature flags)</Subtitulo>
      <p className="mb-3 text-sm">Active o desactive módulos para la finca. Los celulares lo aplican al sincronizar.</p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {MODULOS.filter((m) => m.plataformas.length > 0).map((m) => {
          const activo = !inactivos.has(m.codigo);
          return (
            <div key={m.codigo} className="flex items-center justify-between border border-neutros-n200 px-3 py-2">
              <div>
                <p className="font-semibold text-neutros-n900">{m.nombre}</p>
                <p className="text-xs text-neutros-n500">
                  {m.plataformas.join(' · ')} {m.estado === 'proximamente' ? '· Próximamente' : ''}
                </p>
              </div>
              <button onClick={() => cambiar.mutate({ codigo: m.codigo, activo: !activo })} aria-pressed={activo}>
                <Estado tipo={activo ? 'exito' : 'neutro'} texto={activo ? 'Activo' : 'Apagado'} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

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
  const { data } = useQuery({ queryKey: ['admin', 'formularios'], queryFn: () => api<FilaFormulario[]>('/admin/formularios') });
  const activo = useMemo(() => data?.find((f) => f.activo && f.codigo === 'muestreo_plagas'), [data]);
  const [campo, setCampo] = useState({ id: '', etiqueta: '', tipo: 'entero', requerido: false, min: '', max: '' });
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const publicar = useMutation({
    mutationFn: (d: Omit<DefinicionFormulario, 'version'>) => api<{ version: number }>('/admin/formularios', { method: 'POST', body: d }),
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
        Agregar un campo publica una versión nueva del formulario; llega a los celulares al sincronizar, sin actualizar la app. Cada registro guarda la versión con que se creó.
      </p>
      {activo ? (
        <>
          <p className="mb-2 text-sm">
            <b className="uppercase">{activo.titulo}</b> · versión activa {activo.version} · {activo.definicion.campos.length} campos
          </p>
          <ol className="mb-4 list-inside list-decimal text-sm">
            {activo.definicion.campos.map((c) => (
              <li key={c.id}>
                {c.etiqueta} <code className="text-neutros-n500">({c.id}, {c.tipo}{c.requerido ? ', obligatorio' : ''}{c.visibleSi ? `, si ${c.visibleSi.campo}` : ''})</code>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-end gap-3">
            <Campo etiqueta="Id del campo" placeholder="hojas_funcionales" value={campo.id} onChange={(e) => setCampo({ ...campo, id: e.target.value })} />
            <Campo etiqueta="Pregunta" value={campo.etiqueta} onChange={(e) => setCampo({ ...campo, etiqueta: e.target.value })} />
            <Selector etiqueta="Tipo" value={campo.tipo} onChange={(e) => setCampo({ ...campo, tipo: e.target.value })}>
              {TIPOS_CAMPO.filter((t) => !['opcion', 'multiopcion'].includes(t)).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Selector>
            <Campo etiqueta="Mín." type="number" value={campo.min} onChange={(e) => setCampo({ ...campo, min: e.target.value })} className="w-20" />
            <Campo etiqueta="Máx." type="number" value={campo.max} onChange={(e) => setCampo({ ...campo, max: e.target.value })} className="w-20" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-black" checked={campo.requerido} onChange={(e) => setCampo({ ...campo, requerido: e.target.checked })} /> Obligatorio
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
                publicar.mutate({ ...resto, campos: [...activo.definicion.campos, nuevo] } as never);
              }}
            >
              Agregar campo y publicar
            </Boton>
          </div>
        </>
      ) : null}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold uppercase">Editar definición completa (JSON)</summary>
        <textarea
          className="mt-2 h-64 w-full border border-neutros-n300 p-2 font-mono text-xs"
          value={texto || JSON.stringify(activo?.definicion ?? {}, null, 2)}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Definición del formulario en JSON"
        />
        <Boton
          variante="secundario"
          onClick={() => {
            try {
              const d = esquemaDefinicionFormulario.parse({ ...JSON.parse(texto || JSON.stringify(activo?.definicion)), version: 1 });
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
      {publicar.isSuccess ? <Aviso tipo="exito">Versión {publicar.data.version} publicada.</Aviso> : null}
    </>
  );
}

interface EntradaBitacora {
  id: string;
  accion: string;
  tabla: string | null;
  registro_id: string | null;
  usuario_id: string | null;
  dispositivo_id: string | null;
  created_at: number;
}

export function Bitacora() {
  const n = useNombres();
  const { data } = useQuery({ queryKey: ['admin', 'bitacora'], queryFn: () => api<EntradaBitacora[]>('/admin/bitacora?limite=300') });
  return (
    <>
      <Subtitulo>Bitácora</Subtitulo>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-marca-negro">
            <th className={th}>Hora</th>
            <th className={th}>Acción</th>
            <th className={th}>Tabla</th>
            <th className={th}>Usuario</th>
            <th className={th}>Dispositivo</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((b) => (
            <tr key={b.id} className="border-b border-neutros-n200">
              <td className="px-2 py-1 tabular">{formatearFechaHora(b.created_at)}</td>
              <td className="px-2 py-1 font-semibold uppercase">{b.accion.replace(/_/g, ' ')}</td>
              <td className="px-2 py-1">{b.tabla ?? '—'}</td>
              <td className="px-2 py-1">{n.usuarios.get(String(b.usuario_id)) ?? '—'}</td>
              <td className="px-2 py-1 font-mono text-xs">{b.dispositivo_id?.slice(0, 8) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
