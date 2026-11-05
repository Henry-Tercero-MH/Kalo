'use client';

/**
 * Panel de dispositivos: último sincronizado, versión de la app, pendientes reportados,
 * bloqueo y borrado remoto, e importación de respaldos cifrados.
 */
import { formatearFechaHora, formatearNumero } from '@kalo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabla, type Columna } from '@/componentes/Tabla';
import { Boton, Estado, Titulo, type TipoEstado } from '@/componentes/ui';
import { api } from '@/lib/api';
import { ImportarRespaldo } from './_componentes/ImportarRespaldo';

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
      <ImportarRespaldo />
    </>
  );
}
