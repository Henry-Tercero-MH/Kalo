import type { PuntoGrafico } from './GraficoPronostico';

export interface FilaEcuacion {
  id: string;
  codigo: string;
  nombre: string;
  hectareas: number;
  poblacion: number;
  retorno: number;
  recobro: number;
  recobroObservado: number | null;
  factor: number;
  cajasHaAnio: number;
  cajasLoteAnio: number;
}

export interface Ecuacion {
  semanaActual: { anio: number; numero: number };
  factorSemanaActual: number;
  factorPromedioAnual: number;
  retorno: number;
  recobroReferencia: number;
  lotes: FilaEcuacion[];
}

export interface Semanal {
  semanaActual: { anio: number; numero: number };
  recobroPorDefecto: number;
  distribucion: Record<string, number>;
  distribucionPendiente: boolean;
  semanas: (PuntoGrafico & {
    anio: number;
    porColor: { colorCintaId: string; racimos: number }[];
  })[];
}
