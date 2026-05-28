import { Outlet } from "@tanstack/react-router";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  return (
    <div className="flex h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="tricolor-bar h-[3px] w-full" />
        <Topbar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
