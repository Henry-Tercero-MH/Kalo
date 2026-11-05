'use client';

/**
 * Calculadora de la ecuación productiva por lote y pronóstico semanal de cajas
 * (racimos por color × recobro × factor de la semana).
 */
import { Aviso, Titulo } from '@/componentes/ui';
import { SeccionEcuacion } from './_componentes/SeccionEcuacion';
import { SeccionSemanal } from './_componentes/SeccionSemanal';

export default function Pronostico() {
  return (
    <>
      <Titulo>Pronóstico</Titulo>
      <Aviso tipo="alerta">
        Datos de demostración (DEMO). Las cifras no corresponden a producción real.
      </Aviso>
      <SeccionEcuacion />
      <SeccionSemanal />
    </>
  );
}
