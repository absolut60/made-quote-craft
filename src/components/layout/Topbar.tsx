import { useRouterState } from "@tanstack/react-router";
import { LogOut, Search, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const labels: Record<string, string> = {
  "": "Dashboard",
  preventivi: "Preventivi",
  articoli: "Articoli",
  listini: "Listini",
  kit: "Kit / Lavorazioni",
  clienti: "Clienti",
  utenti: "Utenti",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  commerciale: "Commerciale",
  lettura: "Lettura",
};

export function Topbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.length === 0 ? ["Dashboard"] : segments.map((s) => labels[s] ?? s);
  const { profile, user, roles, signOut } = useAuth();

  const displayName = profile?.display_name || profile?.email || user?.email || "Utente";
  const roleLabel = roles.length ? roles.map((r) => ROLE_LABEL[r] ?? r).join(", ") : "—";
  const initial = (displayName[0] ?? "?").toUpperCase();

  return (
    <header className="h-14 shrink-0 bg-card border-b border-border flex items-center px-6 gap-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
        <span className="text-foreground font-semibold">Sistema MADE</span>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2 min-w-0">
            <span className="text-muted-foreground/50">/</span>
            <span className={i === crumbs.length - 1 ? "text-foreground truncate" : "truncate"}>
              {c}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex-1 max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cerca articoli, preventivi, clienti…"
            className="w-full h-9 pl-9 pr-3 rounded-md bg-background border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 rounded-md px-2 py-1 transition hover:bg-muted">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium leading-tight">{displayName}</div>
              <div className="text-[11px] text-muted-foreground font-mono leading-tight">
                {roleLabel}
              </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-navy text-navy-foreground flex items-center justify-center font-mono text-sm font-semibold">
              {user ? initial : <User className="h-4 w-4" />}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="font-semibold">{displayName}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void signOut()} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Esci
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
