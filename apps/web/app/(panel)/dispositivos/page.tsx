'use client';

/**
 * Panel de dispositivos: último sincronizado, versión de la app, pendientes reportados,
 * bloqueo y borrado remoto, e importación de respaldos cifrados.
 */
import { formatearFechaHora, formatearNumero } from '@kalo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Tabla, type Columna } from '@/componentes/Tabla';
import { Aviso, Boton, Estado, Subtitulo, Titulo, type TipoEstado } from '@/componentes/ui';
import { api } from '@/lib/api';

interface Dispositivo {
  id: string;
  nombre: string;
  modelo: string | null;
  sistema: string | null;
  version_app: string | null;
  estado: string;
  ultimo_sync: number | null;
  registros_pendientes: number;
  archivos_pendientes: number;
}

const TIPO: Record<string, TipoEstado> = {
  activo: 'exito',
  bloqueado: 'alerta',
  borrado_solicitado: 'peligro',
  borrado: 'neutro',
};
const TEXTO: Record<string, string> = {
  activo: 'Activo',
  bloqueado: 'Bloqueado',
  borrado_solicitado: 'Borrado solicitado',
  borrado: 'Borrado',
};

export default function Dispositivos() {
  const cliente = useQueryClient();
  const { data } = useQuery({
    queryKey: ['dispositivos'],
    queryFn: () => api<Dispositivo[]>('/dispositivos'),
    refetchInterval: 30_000,
  });
  const [mensaje, setMensaje] = useState<{ tipo: TipoEstado; texto: string } | null>(null);
  const cambiar = useMutation({
    mutationFn: (v: { id: string; estado: string }) =>
      api(`/dispositivos/${v.id}`, { method: 'PATCH', body: { estado: v.estado } }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['dispositivos'] }),
  });
  const columnas: Columna<Dispositivo>[] = [
    {
      header: 'Dispositivo',
      accessorKey: 'nombre',
      cell: ({ row }) => <span className="font-semibold">{row.original.nombre}</span>,
    },
    {
      header: 'Modelo',
      accessorFn: (d) => [d.modelo, d.sistema].filter(Boolean).join(' · ') || '—',
    },
    { header: 'Versión app', accessorFn: (d) => d.version_app ?? '—' },
    {
      header: 'Último sincronizado',
      accessorKey: 'ultimo_sync',
      cell: ({ getValue }) => (getValue() ? formatearFechaHora(Number(getValue())) : 'Nunca'),
    },
    {
      header: 'Registros pendientes',
      accessorKey: 'registros_pendientes',
      meta: { numero: true },
      cell: ({ getValue }) => formatearNumero(Number(getValue())),
    },
    {
      header: 'Archivos pendientes',
      accessorKey: 'archivos_pendientes',
      meta: { numero: true },
      cell: ({ getValue }) => formatearNumero(Number(getValue())),
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ getValue }) => (
        <Estado
          tipo={TIPO[String(getValue())] ?? 'neutro'}
          texto={TEXTO[String(getValue())] ?? String(getValue())}
        />
      ),
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex flex-wrap gap-2">
            {d.estado === 'activo' ? (
              <Boton
                variante="secundario"
                onClick={() => cambiar.mutate({ id: d.id, estado: 'bloqueado' })}
              >
                Bloquear
              </Boton>
            ) : (
              <Boton
                variante="secundario"
                onClick={() => cambiar.mutate({ id: d.id, estado: 'activo' })}
              >
                Reactivar
              </Boton>
            )}
            {d.estado !== 'borrado' && d.estado !== 'borrado_solicitado' ? (
              <Boton
                variante="peligro"
                onClick={() => {
                  if (
                    window.confirm(
                      `¿Borrar todos los datos de «${d.nombre}» la próxima vez que se conecte?`,
                    )
                  )
                    cambiar.mutate({ id: d.id, estado: 'borrado_solicitado' });
                }}
              >
                Borrado remoto
              </Boton>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Titulo>Dispositivos</Titulo>
      <Tabla datos={data ?? []} columnas={columnas} vacio="Aún no hay celulares configurados." />
      <Subtitulo>Importar respaldo cifrado</Subtitulo>
      <p className="mb-2 text-sm">
        Si un celular nunca logra sincronizar, exporte su respaldo desde la app (Sincronizar →
        Exportar respaldo) y cárguelo aquí.
      </p>
      <input
        type="file"
        accept=".json,application/json"
        className="text-sm"
        onChange={async (e) => {
          const archivo = e.target.files?.[0];
          if (!archivo) return;
          try {
            const contenido = JSON.parse(await archivo.text());
            const r = await api<{ resultados: { estado: string }[] }>('/respaldos/importar', {
              method: 'POST',
              body: contenido,
            });
            const aceptados = r.resultados.filter((x) => x.estado !== 'rechazado').length;
            setMensaje({
              tipo: 'exito',
              texto: `Respaldo importado: ${aceptados} de ${r.resultados.length} registros aceptados.`,
            });
          } catch (err) {
            setMensaje({
              tipo: 'peligro',
              texto: `No se pudo importar: ${(err as Error).message}`,
            });
          }
        }}
      />
      {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}
    </>
  );
}
