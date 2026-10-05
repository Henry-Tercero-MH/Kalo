import '@fontsource/archivo/400.css';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/800.css';
import '@fontsource/anton/400.css';
import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Proveedores } from '@/componentes/Proveedores';

export const metadata: Metadata = {
  title: 'Kalo Campo — Panel',
  description: 'Panel de datos de campo de Inversiones Kalo (DEMO)',
};

export default function RaizLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  );
}
