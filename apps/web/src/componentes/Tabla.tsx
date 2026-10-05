'use client';

/**
 * Tabla de datos (TanStack Table): encabezados en mayúsculas pequeñas con espaciado amplio,
 * números alineados a la derecha con cifras tabulares, filas divididas en gris 1 pt.
 */
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';

export type Columna<T> = ColumnDef<T, unknown> & { meta?: { numero?: boolean } };

export function Tabla<T>({
  datos,
  columnas,
  vacio = 'Sin registros.',
  porPagina = 50,
}: {
  datos: T[];
  columnas: Columna<T>[];
  vacio?: string;
  porPagina?: number;
}) {
  const [orden, setOrden] = useState<SortingState>([]);
  const tabla = useReactTable({
    data: datos,
    columns: columnas,
    state: { sorting: orden },
    onSortingChange: setOrden,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: porPagina } },
  });
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          {tabla.getHeaderGroups().map((g) => (
            <tr key={g.id} className="border-b-2 border-marca-negro">
              {g.headers.map((h) => {
                const numero = (h.column.columnDef.meta as { numero?: boolean } | undefined)
                  ?.numero;
                const dir = h.column.getIsSorted();
                return (
                  <th
                    key={h.id}
                    scope="col"
                    onClick={h.column.getCanSort() ? h.column.getToggleSortingHandler() : undefined}
                    className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutros-n500 ${numero ? 'text-right' : 'text-left'}`}
                    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {dir === 'asc' ? ' ↑' : dir === 'desc' ? ' ↓' : ''}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {tabla.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} className="px-3 py-6 text-neutros-n500">
                {vacio}
              </td>
            </tr>
          ) : (
            tabla.getRowModel().rows.map((f) => (
              <tr key={f.id} className="border-b border-neutros-n200 hover:bg-neutros-n50">
                {f.getVisibleCells().map((c) => {
                  const numero = (c.column.columnDef.meta as { numero?: boolean } | undefined)
                    ?.numero;
                  return (
                    <td
                      key={c.id}
                      className={`px-3 py-2 align-top text-neutros-n700 ${numero ? 'tabular text-right' : ''}`}
                    >
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {tabla.getPageCount() > 1 ? (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <button
            className="border border-marca-negro px-3 py-1 disabled:opacity-40"
            disabled={!tabla.getCanPreviousPage()}
            onClick={() => tabla.previousPage()}
          >
            Anterior
          </button>
          <span className="tabular">
            Página {tabla.getState().pagination.pageIndex + 1} de {tabla.getPageCount()} ·{' '}
            {datos.length} registros
          </span>
          <button
            className="border border-marca-negro px-3 py-1 disabled:opacity-40"
            disabled={!tabla.getCanNextPage()}
            onClick={() => tabla.nextPage()}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  );
}
