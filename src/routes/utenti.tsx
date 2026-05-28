import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fetchUsers, setUserRole, toggleUserDisabled } from "@/lib/users-api";
import { inviteUser, deleteAuthUser } from "@/lib/users.functions";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/utenti")({
  head: () => ({ meta: [{ title: "Utenti — Sistema MADE" }] }),
  component: () => (
    <AppShell requireRole="admin">
      <UtentiPage />
    </AppShell>
  ),
});

const ROLES: AppRole[] = ["admin", "commerciale", "lettura"];

function UtentiPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

  const invite = useServerFn(inviteUser);
  const removeUser = useServerFn(deleteAuthUser);

  const inviteMut = useMutation({
    mutationFn: (vars: { email: string; display_name?: string }) =>
      invite({ data: vars }),
    onSuccess: () => {
      toast.success("Invito inviato");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Errore"),
  });

  const roleMut = useMutation({
    mutationFn: (vars: { user_id: string; role: AppRole }) =>
      setUserRole(vars.user_id, vars.role),
    onSuccess: () => {
      toast.success("Ruolo aggiornato");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Errore"),
  });

  const toggleMut = useMutation({
    mutationFn: (vars: { user_id: string; disabled: boolean }) =>
      toggleUserDisabled(vars.user_id, vars.disabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Errore"),
  });

  const delMut = useMutation({
    mutationFn: (user_id: string) => removeUser({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Utente eliminato");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Errore"),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Utenti</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestione utenti, ruoli e accessi.
          </p>
        </div>
        <InviteDialog
          loading={inviteMut.isPending}
          onSubmit={(v) => inviteMut.mutate(v)}
        />
      </div>

      <div className="mt-6 bg-card border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-2">Nome</th>
              <th className="text-left font-medium px-4 py-2">Email</th>
              <th className="text-left font-medium px-4 py-2">Ruolo</th>
              <th className="text-left font-medium px-4 py-2">Stato</th>
              <th className="text-right font-medium px-4 py-2">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Caricamento…</td></tr>
            )}
            {users?.map((u) => {
              const isMe = u.id === me?.id;
              const role = (u.roles[0] ?? "lettura") as AppRole;
              return (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 text-foreground">{u.display_name ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2">
                    <Select
                      value={role}
                      onValueChange={(v) => roleMut.mutate({ user_id: u.id, role: v as AppRole })}
                      disabled={isMe}
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${u.disabled ? "bg-destructive/10 text-destructive" : "bg-tri-green/10 text-tri-green"}`}>
                      {u.disabled ? "Disattivato" : "Attivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isMe || toggleMut.isPending}
                        onClick={() => toggleMut.mutate({ user_id: u.id, disabled: !u.disabled })}
                      >
                        {u.disabled ? "Riattiva" : "Disattiva"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isMe || delMut.isPending}
                        onClick={() => {
                          if (confirm(`Eliminare l'utente ${u.email}? L'operazione è irreversibile.`)) {
                            delMut.mutate(u.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InviteDialog({
  onSubmit, loading,
}: { onSubmit: (v: { email: string; display_name?: string }) => void; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><UserPlus className="h-4 w-4 mr-2" /> Invita utente</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invita un nuovo utente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@made.it" />
          </div>
          <div>
            <Label>Nome (opzionale)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            L'utente riceverà un'email con un link per impostare la password. Verrà creato con ruolo "lettura".
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
          <Button
            disabled={loading || !email}
            onClick={() => {
              onSubmit({ email, display_name: name || undefined });
              setOpen(false);
              setEmail(""); setName("");
            }}
          >Invia invito</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
