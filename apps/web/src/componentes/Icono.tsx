import {
  BadgeCheck,
  Bug,
  Calculator,
  ChartColumn,
  ClipboardList,
  FileChartColumn,
  ListChecks,
  Map,
  Package,
  Route,
  Satellite,
  ScanQrCode,
  Settings,
  Smartphone,
  Square,
  Table,
  Tractor,
  TriangleAlert,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/** Íconos de línea Lucide del color del texto (mapa explícito para un bundle pequeño). */
const ICONOS: Record<string, LucideIcon> = {
  'badge-check': BadgeCheck,
  bug: Bug,
  calculator: Calculator,
  'chart-column': ChartColumn,
  'clipboard-list': ClipboardList,
  'file-chart-column': FileChartColumn,
  'list-checks': ListChecks,
  map: Map,
  package: Package,
  route: Route,
  satellite: Satellite,
  'scan-qr-code': ScanQrCode,
  settings: Settings,
  smartphone: Smartphone,
  table: Table,
  tractor: Tractor,
  'triangle-alert': TriangleAlert,
  users: Users,
  wallet: Wallet,
};

export function Icono({ nombre, tamano = 18 }: { nombre: string; tamano?: number }) {
  const C = ICONOS[nombre] ?? Square;
  return <C size={tamano} strokeWidth={2} aria-hidden />;
}
