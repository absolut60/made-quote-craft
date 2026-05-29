import { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar, SidebarBody } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { AuthGate } from "@/components/auth/AuthGate";
import type { AppRole } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo-made.png";

export function AppShell({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: AppRole;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthGate requireRole={requireRole}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="tricolor-bar h-[3px] w-full" />

          {/* Mobile topbar — visibile solo sotto lg. Sfondo navy come la sidebar per leggibilità del logo bianco */}
          <div className="lg:hidden h-14 shrink-0 bg-sidebar text-sidebar-foreground border-b border-sidebar-border flex items-center justify-between px-3 gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Apri menu"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground hover:bg-white/10"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
                <SidebarBody onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <img src={logo} alt="Sistema MADE" className="h-7 w-auto" />

            <div className="w-9" />
          </div>

          {/* Topbar desktop — invariata, nascosta sotto lg */}
          <div className="hidden lg:block">
            <Topbar />
          </div>

          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
