import { ChartColumn, Kanban, LayoutDashboard, Map, Search, Settings, Star, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Sidebar navigation, grouped so it's easy to scan. */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Vandaag",
    items: [{ href: "/", label: "Overzicht", icon: LayoutDashboard }],
  },
  {
    label: "Vinden",
    items: [
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/search", label: "Zoeken", icon: Search },
      { href: "/map", label: "Kaart", icon: Map },
      { href: "/saved", label: "Bewaard", icon: Star },
    ],
  },
  {
    label: "Verkoop",
    items: [
      { href: "/pipeline", label: "Pipeline", icon: Kanban },
      { href: "/analytics", label: "Cijfers", icon: ChartColumn },
    ],
  },
  {
    label: "Werkruimte",
    items: [{ href: "/settings", label: "Instellingen", icon: Settings }],
  },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
