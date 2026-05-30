import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo-made-white.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Accedi — Sistema MADE" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: search.redirect || "/" });
    }
  }, [loading, user, navigate, search.redirect]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Accesso effettuato");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Email di reset inviata, controlla la casella");
        setMode("login");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src={logo} alt="sistema MADE" className="h-10 w-auto" />
          <div className="tricolor-bar h-[3px] w-32 rounded-sm" />
          <h1 className="text-white text-lg font-semibold">Sistema MADE — Preventivatore</h1>
          <p className="text-xs text-white/60 uppercase tracking-widest">Accesso riservato</p>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-xl">
          <h2 className="text-base font-semibold">
            {mode === "login" ? "Accedi" : "Reimposta password"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "login"
              ? "Inserisci le tue credenziali per accedere."
              : "Riceverai una email con il link per impostare una nuova password."}
          </p>

          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode === "login" && (
              <div className="grid gap-1.5">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <Input
                  id="password" type="password" autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            <Button type="submit" disabled={busy} className="mt-2">
              {busy ? "Attendi…" : mode === "login" ? "Accedi" : "Invia email"}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs">
            {mode === "login" ? (
              <button onClick={() => setMode("reset")} className="text-primary underline-offset-4 hover:underline">
                Password dimenticata?
              </button>
            ) : (
              <button onClick={() => setMode("login")} className="text-primary underline-offset-4 hover:underline">
                Torna all'accesso
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
