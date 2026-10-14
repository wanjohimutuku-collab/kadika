import {
  AlertTriangle,
  BellRing,
  Calendar,
  Check,
  ChevronRight,
  CircleCheck,
  Clock,
  Copy,
  Download,
  FileText,
  Globe,
  History,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  Send,
  Settings,
  Shield,
  Smartphone,
  Upload,
  UserPlus,
  Users,
  Wallet,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react-native';

/** One place for the app's icons (Lucide, §17.2): 24 px, 2 px stroke unless a screen says otherwise. */
export const ICONS = {
  overview: LayoutDashboard,
  guests: Users,
  send: Send,
  gate: ScanLine,
  pledges: Wallet,
  check: Check,
  checkCircle: CircleCheck,
  close: X,
  warn: AlertTriangle,
  search: Search,
  plus: Plus,
  next: ChevronRight,
  phone: Phone,
  whatsapp: MessageCircle,
  sms: Smartphone,
  card: FileText,
  settings: Settings,
  language: Globe,
  offline: WifiOff,
  sync: RefreshCw,
  copy: Copy,
  qr: QrCode,
  invite: UserPlus,
  import: Upload,
  calendar: Calendar,
  pin: MapPin,
  shield: Shield,
  history: History,
  download: Download,
  bell: BellRing,
  clock: Clock,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 24,
  color = '#1B1B1F',
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const C = ICONS[name];
  // decorative: the word next to it carries the meaning (§17.12)
  return (
    <C
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
