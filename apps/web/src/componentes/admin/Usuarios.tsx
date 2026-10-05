'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Tabla, type Columna } from '@/componentes/Tabla';
import { Aviso, Boton, Campo, Estado, Selector, Subtitulo } from '@/componentes/ui';
import { api } from '@/lib/api';
import { useCatalogos } from '@/lib/catalogos';

interface UsuarioAdmin {
  id: string;
  usuario: string;
  nombre: string;
  rol_id: string;
  finca_id: string;
  activo: boolean;
  tiene_gafete: boolean;
}

export function Usuarios() {
  const cliente = useQueryClient();
  const { data: cat } = useCatalogos();
  const { data } = useQuery({
    queryKey: ['admin', 'usuarios'],
    queryFn: () => api<UsuarioAdmin[]>('/admin/usuarios'),
  });
  const [nuevo, setNuevo] = useState({ usuario: '', nombre: '', rol_id: '', pin: '' });
  const [gafete, setGafete] = useState<string | null>(null);
  const refrescar = () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: ['admin', 'usuarios'] }),
      cliente.invalidateQueries({ queryKey: ['catalogos'] }),
    ]);
  const crear = useMutation({
    mutationFn: () =>
      api('/admin/usuarios', { method: 'POST', body: { ...nuevo, finca_id: cat?.finca?.id } }),
    onSuccess: () => {
      setNuevo({ usuario: '', nombre: '', rol_id: '', pin: '' });
      return refrescar();
    },
  });
  const editar = useMutation({
    mutationFn: (v: { id: string; cambios: Record<string, unknown> }) =>
      api(`/admin/usuarios/${v.id}`, { method: 'PATCH', body: v.cambios }),
    onSuccess: refrescar,
  });
  const generarGafete = useMutation({
    mutationFn: (id: string) =>
      api<{ codigo: string }>(`/admin/usuarios/${id}/gafete`, { method: 'POST', body: {} }),
    onSuccess: (r) => {
      setGafete(r.codigo);
      return refrescar();
    },
  });
  const rol = (id: string) => cat?.roles.find((r) => r.id === id)?.nombre ?? '—';
  const columnas: Columna<UsuarioAdmin>[] = [
    { header: 'Usuario', accessorKey: 'usuario' },
    { header: 'Nombre', accessorKey: 'nombre' },
    {
      header: 'Rol',
      accessorKey: 'rol_id',
      cell: ({ row }) => (
        <select
          className="border border-neutros-n300 px-2 py-1"
          value={row.original.rol_id}
          onChange={(e) =>
            editar.mutate({ id: row.original.id, cambios: { rol_id: e.target.value } })
          }
          aria-label={`Rol de ${row.original.nombre}`}
        >
          {cat?.roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
      ),
    },
    {
      header: 'Estado',
      accessorKey: 'activo',
      cell: ({ getValue }) => (
        <Estado tipo={getValue() ? 'exito' : 'neutro'} texto={getValue() ? 'Activo' : 'Inactivo'} />
      ),
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Boton
            variante="secundario"
            onClick={() =>
              editar.mutate({ id: row.original.id, cambios: { activo: !row.original.activo } })
            }
          >
            {row.original.activo ? 'Desactivar' : 'Activar'}
          </Boton>
          <Boton
            variante="secundario"
            onClick={() => {
              const pin = window.prompt('Nuevo PIN de 4 dígitos');
              if (pin && /^\d{4}$/.test(pin))
                editar.mutate({ id: row.original.id, cambios: { pin } });
            }}
          >
            Cambiar PIN
          </Boton>
          <Boton variante="secundario" onClick={() => generarGafete.mutate(row.original.id)}>
            {row.original.tiene_gafete ? 'Nuevo gafete' : 'Generar gafete'}
          </Boton>
        </div>
      ),
    },
  ];
  return (
    <>
      <Subtitulo>Usuarios</Subtitulo>
      {gafete ? (
        <Aviso>
          Contenido del QR del gafete (imprímalo con cualquier generador de QR):{' '}
          <code className="font-semibold">{gafete}</code>
        </Aviso>
      ) : null}
      <Tabla datos={data ?? []} columnas={columnas} />
      <Subtitulo>Nuevo usuario</Subtitulo>
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-5">
        <Campo
          etiqueta="Usuario"
          value={nuevo.usuario}
          onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value.toLowerCase() })}
        />
        <Campo
          etiqueta="Nombre"
          value={nuevo.nombre}
          onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
        />
        <Selector
          etiqueta="Rol"
          value={nuevo.rol_id}
          onChange={(e) => setNuevo({ ...nuevo, rol_id: e.target.value })}
        >
          <option value="">Elija…</option>
          {cat?.roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </Selector>
        <Campo
          etiqueta="PIN"
          inputMode="numeric"
          maxLength={4}
          value={nuevo.pin}
          onChange={(e) => setNuevo({ ...nuevo, pin: e.target.value })}
        />
        <Boton
          disabled={!nuevo.usuario || !nuevo.nombre || !nuevo.rol_id || !/^\d{4}$/.test(nuevo.pin)}
          onClick={() => crear.mutate()}
        >
          Crear
        </Boton>
      </div>
      {crear.error ? <Aviso tipo="peligro">{(crear.error as Error).message}</Aviso> : null}
      <p className="mt-2 text-xs text-neutros-n500">
        Rol actual de cada usuario: {data?.map((u) => `${u.usuario} (${rol(u.rol_id)})`).join(', ')}
      </p>
    </>
  );
}
