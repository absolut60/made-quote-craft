import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Package,
  Tags,
  Wrench,
  Users,
  UserCog,
} from "lucide-react";
import logo from "@/assets/logo-made.png";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/preventivi", label: "Preventivi", icon: FileText },
  { to: "/articoli", label: "Articoli", icon: Package },
  { to: "/listini", label: "Listini", icon: Tags },
  { to: "/kit", label: "Kit / Lavorazioni", icon: Wrench },
  { to: "/clienti", label: "Clienti", icon: Users },
  { to: "/utenti", label: "Utenti", icon: UserCog },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 pt-5 pb-4">
        <img src={logo} alt="Sistema MADE" className="h-8 w-auto" />
        <div className="tricolor-bar mt-3 h-[3px] w-24 rounded-sm" />
        <p className="mt-3 text-[11px] uppercase tracking-widest text-sidebar-foreground/60">
          Preventivatore
        </p>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-sidebar-active text-white font-medium"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-hover hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/55 font-mono">
        v0.1 · Gruppo MADE
      </div>
    </aside>
  );
}
