import {
  LayoutDashboard,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Users,
  UserCheck,
  UserCog,
  Tag,
  MapPin,
  Settings,
  Home,
  Megaphone,
  Dumbbell,
  CreditCard,
  Shield,
  UserPlus,
  Server,
  LucideIcon,
} from "lucide-react";

/**
 * Maps icon string names from API to Lucide React icons
 */
export const getIconFromString = (iconName: string | null): LucideIcon => {
  // Handle null or empty icon names
  if (!iconName) {
    return Settings; // Default icon
  }

  const iconMap: Record<string, LucideIcon> = {
    dashboard: LayoutDashboard,
    "layout-dashboard": LayoutDashboard,
    users: Users,
    "user-check": UserCheck,
    "user-cog": UserCog,
    clock: Clock,
    "check-circle-2": CheckCircle2,
    "x-circle": XCircle,
    file: FileText,
    "file-text": FileText,
    tag: Tag,
    "map-pin": MapPin,
    settings: Settings,
    home: Home,
    "real-estate": Home,
    "real-estate-management": Home,
    "realestate": Home,
    "realestate-management": Home,
    megaphone: Megaphone,
    ad: Megaphone,
    ads: Megaphone,
    advertisement: Megaphone,
    dumbbell: Dumbbell,
    fitness: Dumbbell,
    "credit-card": CreditCard,
    creditcard: CreditCard,
    subscriptions: CreditCard,
    shield: Shield,
    roles: Shield,
    "user-plus": UserPlus,
    visitor: UserPlus,
    visitors: UserPlus,
    infrastructure: Server,
    server: Server,
    // Add more mappings as needed
  };

  // Return mapped icon or default to Settings
  return iconMap[iconName.toLowerCase()] || Settings;
};

