import { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar, SidebarBody } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { AuthGate } from "@/components/auth/AuthGate";
import type { AppRole } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo-made-white.png";

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
          {/* Mobile topbar — sticky in cima, rispetta la safe area iOS */}
          <div
            className="lg:hidden sticky top-0 z-40 shrink-0 bg-sidebar text-sidebar-foreground border-b border-sidebar-border"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="tricolor-bar h-[3px] w-full" />
            <div className="h-14 flex items-center justify-between px-3 gap-3">
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

              <img src={logo} alt="sistema MADE" className="h-6 w-auto" />

              <div className="w-9" />
            </div>
          </div>

          {/* Tricolor bar desktop */}
          <div className="hidden lg:block tricolor-bar h-[3px] w-full" />

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
