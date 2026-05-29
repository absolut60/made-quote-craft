import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchUsers, type UserRow } from "@/lib/users-api";
import { adminCreateUser, adminUpdateUser, adminSuspendUser, deleteAuthUser } from "@/lib/users.functions";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { MoreHorizontal, UserPlus, Eye, EyeOff, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/utenti")({
  head: () => ({ meta: [{ title: "Utenti — Sistema MADE" }] }),
  component: () => (
    <AppShell requireRole="admin">
      <UtentiPage />
    </AppShell>
  ),
});

const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "commerciale", label: "Commerciale" },
  { value: "lettura", label: "Agente" },
];

function roleLabel(r: AppRole) {
  return ROLES.find((x) => x.value === r)?.label ?? r;
}

function roleBadgeClass(r: AppRole) {
  switch (r) {
    case "admin": return "bg-[hsl(220_60%_20%)] text-white";
    case "commerciale": return "bg-blue-600 text-white";
    default: return "bg-muted text-muted-foreground";
  }
}

function generatePassword(len = 12) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%&*?";
  const all = upper + lower + nums + syms;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const chars = [pick(upper), pick(lower), pick(nums), pick(syms)];
  for (let i = chars.length; i < len; i++) chars.push(pick(all));
  return chars.sort(() => Math.random() - 0.5).join("");
}

function UtentiPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [suspendUser, setSuspendUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);

  const createFn = useServerFn(adminCreateUser);
  const updateFn = useServerFn(adminUpdateUser);
  const suspendFn = useServerFn(adminSuspendUser);
  const deleteFn = useServerFn(deleteAuthUser);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const suspendMut = useMutation({
    mutationFn: (vars: { user_id: string; sospeso: boolean }) => suspendFn({ data: vars }),
    onSuccess: (_d, v) => {
      toast.success(v.sospeso ? "Utente sospeso" : "Utente riattivato");
      invalidate();
      setSuspendUser(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Errore"),
  });

  const deleteMut = useMutation({
    mutationFn: (user_id: string) => deleteFn({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Utente eliminato");
      invalidate();
      setDeleteUser(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Errore"),
  });

  return (
    <div className="p-3 md:p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap gap-2 items-baseline justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Utenti</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestione utenti, ruoli e accessi.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Nuovo utente
        </Button>
      </div>

      <div className="mt-6 bg-card border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-2">Nome</th>
              <th className="text-left font-medium px-4 py-2">Cognome</th>
              <th className="text-left font-medium px-4 py-2">Email</th>
              <th className="text-left font-medium px-4 py-2">Ruolo</th>
              <th className="text-left font-medium px-4 py-2">Stato</th>
              <th className="text-right font-medium px-4 py-2 w-16">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Caricamento…</td></tr>
            )}
            {users?.map((u) => {
              const isMe = u.id === me?.id;
              const role = (u.roles[0] ?? "lettura") as AppRole;
              return (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 text-foreground">{u.nome || "—"}</td>
                  <td className="px-4 py-2 text-foreground">{u.cognome || "—"}</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${roleBadgeClass(role)}`}>
                      {roleLabel(role)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${u.disabled ? "bg-destructive/10 text-destructive" : "bg-tri-green/10 text-tri-green"}`}>
                      {u.disabled ? "Sospeso" : "Attivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditUser(u)}>Modifica</DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isMe}
                          onClick={() => setSuspendUser(u)}
                        >
                          {u.disabled ? "Riattiva" : "Sospendi"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={isMe}
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteUser(u)}
                        >
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <UserFormDialog
        key={createOpen ? "create" : "create-closed"}
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSubmit={async (v) => {
          await createFn({ data: {
            email: v.email, password: v.password!, nome: v.nome, cognome: v.cognome, ruolo: v.ruolo,
          } });
          toast.success("Utente creato");
          invalidate();
          setCreateOpen(false);
        }}
      />

      <UserFormDialog
        key={editUser?.id ?? "edit-closed"}
        open={!!editUser}
        onOpenChange={(o) => !o && setEditUser(null)}
        mode="edit"
        initial={editUser ?? undefined}
        onSubmit={async (v) => {
          if (!editUser) return;
          await updateFn({ data: {
            user_id: editUser.id,
            email: v.email,
            nome: v.nome,
            cognome: v.cognome,
            ruolo: v.ruolo,
            ...(v.password ? { password: v.password } : {}),
          } });
          toast.success("Utente aggiornato");
          invalidate();
          setEditUser(null);
        }}
      />

      <AlertDialog open={!!suspendUser} onOpenChange={(o) => !o && setSuspendUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendUser?.disabled ? "Riattivare l'utente?" : "Sospendere l'utente?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendUser?.disabled
                ? `${suspendUser?.email} potrà nuovamente accedere al sistema.`
                : `${suspendUser?.email} non potrà più accedere finché non lo riattivi.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={suspendMut.isPending}
              onClick={() => suspendUser && suspendMut.mutate({
                user_id: suspendUser.id, sospeso: !suspendUser.disabled,
              })}
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare definitivamente l'utente?</AlertDialogTitle>
            <AlertDialogDescription>
              L'utente {deleteUser?.email} verrà eliminato. L'operazione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUser && deleteMut.mutate(deleteUser.id)}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface FormValues {
  nome: string;
  cognome: string;
  email: string;
  ruolo: AppRole;
  password?: string;
}

function UserFormDialog({
  open, onOpenChange, mode, initial, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "create" | "edit";
  initial?: UserRow;
  onSubmit: (v: FormValues) => Promise<void>;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [cognome, setCognome] = useState(initial?.cognome ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [ruolo, setRuolo] = useState<AppRole>((initial?.roles[0] as AppRole) ?? "lettura");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(initial?.nome ?? "");
      setCognome(initial?.cognome ?? "");
      setEmail(initial?.email ?? "");
      setRuolo((initial?.roles[0] as AppRole) ?? "lettura");
      setPassword("");
      setShowPwd(false);
    }
  }, [open, initial]);

  const isCreate = mode === "create";

  const valid =
    nome.trim().length > 0 &&
    cognome.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    (isCreate ? password.length >= 8 : password.length === 0 || password.length >= 8);

  async function submit() {
    if (!valid) return;
    setSubmitting(true);
    try {
      await onSubmit({
        nome: nome.trim(),
        cognome: cognome.trim(),
        email: email.trim(),
        ruolo,
        password: password || undefined,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Errore");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCreate ? "Nuovo utente" : "Modifica utente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <Label>Cognome</Label>
              <Input value={cognome} onChange={(e) => setCognome(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@made.it" />
          </div>
          <div>
            <Label>Ruolo</Label>
            <Select value={ruolo} onValueChange={(v) => setRuolo(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>
              {isCreate ? "Password" : "Nuova password (lascia vuoto per non cambiarla)"}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-9 font-mono"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPwd((s) => !s)}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setPassword(generatePassword(12)); setShowPwd(true); }}
              >
                <RefreshCw className="h-4 w-4 mr-1" /> Genera
              </Button>
            </div>
            {password.length > 0 && password.length < 8 && (
              <p className="text-xs text-destructive mt-1">Minimo 8 caratteri</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annulla</Button>
          <Button disabled={!valid || submitting} onClick={submit}>
            {submitting ? "Salvataggio…" : isCreate ? "Crea utente" : "Salva modifiche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
