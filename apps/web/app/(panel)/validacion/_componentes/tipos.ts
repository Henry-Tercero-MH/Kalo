export type Fila = Record<string, unknown> & { id: string };

export interface CampoConflicto {
  campo: string;
  valorServidor: unknown;
  valorCliente: unknown;
  ganador: 'servidor' | 'cliente';
}

export interface Conflicto {
  id: string;
  tabla: string;
  registro_id: string;
  usuario_id: string | null;
  dispositivo_id: string | null;
  created_at: number;
  datos: {
    campos: CampoConflicto[];
    resultado: Record<string, unknown>;
  };
}

export type Decision = {
  tabla: string;
  id: string;
  decision: 'validado' | 'rechazado';
  motivo?: string;
};

/** Valor final de un campo: el que eligió el supervisor o, si no eligió, el ganador. */
export function valorFinal(k: CampoConflicto, elegidos: Record<string, unknown>): unknown {
  if (k.campo in elegidos) return elegidos[k.campo];
  return k.ganador === 'cliente' ? k.valorCliente : k.valorServidor;
}
