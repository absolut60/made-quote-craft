import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { AuthGate } from "@/components/auth/AuthGate";
import type { AppRole } from "@/hooks/use-auth";

export function AppShell({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: AppRole;
}) {
  return (
    <AuthGate requireRole={requireRole}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="tricolor-bar h-[3px] w-full" />
          <Topbar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
