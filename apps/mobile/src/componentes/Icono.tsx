/**
 * Íconos de línea Lucide, del color del texto. Nunca emojis.
 * Mapa explícito para que el bundle incluya solo los íconos usados.
 */
import {
  BadgeCheck,
  Bug,
  Calculator,
  Camera,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Clock,
  CloudAlert,
  CloudCheck,
  CloudOff,
  CloudUpload,
  Delete,
  Download,
  Eye,
  EyeOff,
  Flag,
  HardHat,
  House,
  Image,
  ImagePlus,
  Info,
  ListChecks,
  LockKeyhole,
  LogOut,
  Map,
  MapPin,
  Mic,
  Minus,
  Package,
  Play,
  Plus,
  RefreshCw,
  Route,
  Satellite,
  ScanQrCode,
  ScanSearch,
  Send,
  Settings,
  ShieldCheck,
  Siren,
  Smartphone,
  SprayCan,
  Square,
  SquarePlus,
  Table,
  Tractor,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  UserRound,
  Users,
  Wifi,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { campo, semantico } from './tema';

const ICONOS: Record<string, LucideIcon> = {
  'badge-check': BadgeCheck,
  bug: Bug,
  calculator: Calculator,
  camera: Camera,
  'chart-column': ChartColumn,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  'clipboard-list': ClipboardList,
  clock: Clock,
  'cloud-alert': CloudAlert,
  'cloud-check': CloudCheck,
  'cloud-off': CloudOff,
  'cloud-upload': CloudUpload,
  delete: Delete,
  download: Download,
  eye: Eye,
  'eye-off': EyeOff,
  flag: Flag,
  'hard-hat': HardHat,
  house: House,
  image: Image,
  'image-plus': ImagePlus,
  info: Info,
  'list-checks': ListChecks,
  'lock-keyhole': LockKeyhole,
  'log-out': LogOut,
  map: Map,
  'map-pin': MapPin,
  mic: Mic,
  minus: Minus,
  package: Package,
  play: Play,
  plus: Plus,
  'refresh-cw': RefreshCw,
  route: Route,
  satellite: Satellite,
  'scan-qr-code': ScanQrCode,
  'scan-search': ScanSearch,
  send: Send,
  settings: Settings,
  'shield-check': ShieldCheck,
  siren: Siren,
  smartphone: Smartphone,
  'spray-can': SprayCan,
  square: Square,
  'square-plus': SquarePlus,
  table: Table,
  tractor: Tractor,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  'triangle-alert': TriangleAlert,
  'user-round': UserRound,
  users: Users,
  wifi: Wifi,
  x: X,
  // Nombres semánticos: un concepto, un ícono en toda la app. Las pantallas nuevas usan estos.
  // Navegación y acciones
  inicio: House,
  atras: ChevronLeft,
  siguiente: ChevronRight,
  cerrar: X,
  /** Agregar un elemento nuevo (labor, registro). */
  agregar: Plus,
  /** Sacar un elemento de una lista (p. ej. un trabajador de una labor). */
  quitar: X,
  /** Contador: sumar y restar una unidad. */
  sumar: Plus,
  restar: Minus,
  guardar: Check,
  /** Marca de opción o casilla elegida. */
  confirmar: Check,
  descargar: Download,
  ajustes: Settings,
  salir: LogOut,
  // Etapa 1: labores y asistencia
  asistencia: Users,
  trabajadores: Users,
  usuario: UserRound,
  labores: ClipboardList,
  asignar: ClipboardList,
  reportar: ListChecks,
  orden: ClipboardList,
  // Captura en campo
  ubicacion: MapPin,
  foto: Camera,
  notaVoz: Mic,
  detener: Square,
  // Sincronización
  /** Enviar o sincronizar los datos guardados en el teléfono. */
  sincronizar: CloudUpload,
  sincronizando: RefreshCw,
  sincronizado: CloudCheck,
  errorEnvio: CloudAlert,
  sinConexion: CloudOff,
  // Estados
  exito: CircleCheck,
  alerta: TriangleAlert,
  error: CircleAlert,
};

export type NombreIcono = keyof typeof ICONOS | (string & {});

export function Icono({
  nombre,
  color = semantico.texto,
  tamano = campo.tamanoIcono,
}: {
  nombre: NombreIcono;
  color?: string;
  tamano?: number;
}) {
  const Componente = ICONOS[nombre];
  if (!Componente) {
    // Un nombre fuera del mapa se dibuja como cuadro vacío; en desarrollo se avisa para agregarlo.
    if (__DEV__) console.warn(`Icono: "${nombre}" no está en el mapa de Icono.tsx`);
    return <Square color={color} size={tamano} strokeWidth={2} />;
  }
  return <Componente color={color} size={tamano} strokeWidth={2} />;
}
