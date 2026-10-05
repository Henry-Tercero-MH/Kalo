'use client';

/**
 * Pronóstico semanal de cajas: una sola serie (columnas), sin leyenda (el título la nombra),
 * tooltip por columna y tabla debajo como vista accesible. Colores de la guía (graficas.*).
 */
import { formatearNumero } from '@kalo/shared';
import { colores } from '@kalo/ui-tokens';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface PuntoGrafico {
  clave: string;
  semana: number;
  cajas: number;
  racimos: number;
  factor: number;
}

export function GraficoPronostico({ datos }: { datos: PuntoGrafico[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Cajas pronosticadas por semana">
      <ResponsiveContainer>
        <BarChart data={datos} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke={colores.graficas.cuadricula} strokeWidth={1} />
          <XAxis
            dataKey="semana"
            tickFormatter={(s) => `S${s}`}
            stroke={colores.graficas.ejes}
            tickLine={false}
            axisLine={{ stroke: colores.graficas.cuadricula }}
            fontSize={12}
          />
          <YAxis
            stroke={colores.graficas.ejes}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickFormatter={(v) => formatearNumero(Number(v))}
            width={64}
          />
          <Tooltip
            cursor={{ fill: colores.neutros.n50 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as PuntoGrafico | undefined;
              if (!active || !p) return null;
              return (
                <div className="border border-neutros-n200 bg-neutros-n0 px-3 py-2 text-sm">
                  <p className="font-extrabold uppercase text-neutros-n900">Semana {p.semana}</p>
                  <p className="tabular">{formatearNumero(p.cajas)} cajas</p>
                  <p className="tabular text-neutros-n500">
                    {formatearNumero(p.racimos)} racimos × factor {formatearNumero(p.factor, 2)}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="cajas"
            fill={colores.graficas.serie1}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
