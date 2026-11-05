import {
  ArrowLeftRight,
  BadgeCheck,
  Boxes,
  Bug,
  Calculator,
  ChartColumn,
  ClipboardList,
  Clock,
  Factory,
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
  Truck,
  UserCog,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

/** Íconos de línea Lucide del color del texto (mapa explícito para un bundle pequeño). */
const ICONOS: Record<string, LucideIcon> = {
  'arrow-left-right': ArrowLeftRight,
  'badge-check': BadgeCheck,
  boxes: Boxes,
  bug: Bug,
  calculator: Calculator,
  'chart-column': ChartColumn,
  'clipboard-list': ClipboardList,
  clock: Clock,
  factory: Factory,
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
  truck: Truck,
  'user-cog': UserCog,
  users: Users,
  wallet: Wallet,
  warehouse: Warehouse,
  wrench: Wrench,
};

export function Icono({
  nombre,
  tamano = 18,
  grosor = 2,
}: {
  nombre: string;
  tamano?: number;
  grosor?: number;
}) {
  const C = ICONOS[nombre] ?? Square;
  return <C size={tamano} strokeWidth={grosor} aria-hidden />;
}
