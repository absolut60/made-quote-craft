import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/hooks/use-auth";

export function AuthGate({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: AppRole;
}) {
  const { loading, user, roles } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: pathname } });
      return;
    }
    if (requireRole && !roles.includes(requireRole)) {
      navigate({ to: "/" });
    }
  }, [loading, user, roles, requireRole, navigate, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Caricamento sessione…</div>
      </div>
    );
  }
  if (!user) return null;

  if (requireRole && !roles.includes(requireRole)) {
    return null;
  }

  return <>{children}</>;
}
