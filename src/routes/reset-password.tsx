import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reimposta password — Sistema MADE" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase imposta una sessione "recovery" alla landing
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pwd.length < 8) { toast.error("Password troppo corta (min 8)"); return; }
    if (pwd !== pwd2) { toast.error("Le password non coincidono"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      toast.success("Password aggiornata");
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-6">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <h1 className="text-base font-semibold">Reimposta password</h1>
        <p className="mt-1 text-xs text-muted-foreground">Imposta la tua nuova password.</p>
        {!ready ? (
          <p className="mt-4 text-sm">Attendere conferma link di recovery…</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pwd" className="text-xs">Nuova password</Label>
              <Input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pwd2" className="text-xs">Conferma password</Label>
              <Input id="pwd2" type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} className="mt-2">
              {busy ? "Attendi…" : "Aggiorna password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
