import {
  Bell,
  Building2,
  ClipboardList,
  Cpu,
  LayoutDashboard,
  SlidersHorizontal,
  Zap,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Solo visible para usuarios con rol ADMIN. */
  adminOnly?: boolean;
  /** Muestra el contador de notificaciones sin leer. */
  showsUnread?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/sala', label: 'Salas', icon: Building2 },
  { href: '/seguimientos', label: 'Ciclos', icon: ClipboardList },
  { href: '/automatizaciones', label: 'Automatizaciones', icon: Zap },
  { href: '/artefactos', label: 'Dispositivos', icon: Cpu },
  { href: '/notificaciones', label: 'Notificaciones', icon: Bell, showsUnread: true },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
  { href: '/admin/rangos', label: 'Rangos', icon: SlidersHorizontal, adminOnly: true },
];

/** Pestañas de la barra inferior en móvil; la quinta la agrega "Más". */
export const MOBILE_TABS = ['/', '/sala', '/seguimientos', '/automatizaciones'];

/** Rutas que quedan dentro del `Sheet` de "Más". */
export const MORE_ROUTES = ['/artefactos', '/notificaciones', '/admin/usuarios', '/admin/rangos'];

export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Título por defecto de una ruta cuando la página todavía no registró el suyo. */
export function routeTitle(pathname: string): string {
  const match = NAV_ITEMS.filter((item) => isActiveRoute(pathname, item.href)).sort(
    (a, b) => b.href.length - a.href.length
  )[0];
  return match?.label ?? 'Cultivo';
}
