import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ComunePicker } from "@/components/clienti/ComunePicker";
import {
  createCantiere,
  deleteCantiere,
  deleteCliente,
  fetchAgenti,
  fetchCantieri,
  fetchCliente,
  FASCE,
  updateCantiere,
  updateCliente,
  type Cantiere,
  type ClienteUpdate,
  type FasciaListino,
} from "@/lib/clienti-api";
import { ArrowLeft, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/clienti/$id")({
  head: () => ({ meta: [{ title: "Scheda cliente — Sistema MADE" }] }),
  component: ClienteDetailPage,
});

const NONE = "__none";

function ClienteDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: cliente, isLoading, error } = useQuery({
    queryKey: ["cliente", id],
    queryFn: () => fetchCliente(id),
  });

  const { data: agenti = [] } = useQuery({ queryKey: ["agenti"], queryFn: fetchAgenti });

  const [form, setForm] = useState<ClienteUpdate>({});
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (cliente) {
      setForm({
        ragione_sociale: cliente.ragione_sociale,
        id_cliente: cliente.id_cliente,
        piva: cliente.piva,
        indirizzo: cliente.indirizzo,
        cap: cliente.cap,
        prov: cliente.prov,
        filiale: cliente.filiale,
        comune_id: cliente.comune_id,
        agente_id: cliente.agente_id,
        fascia_listino_default: cliente.fascia_listino_default,
      });
    }
  }, [cliente]);

  const save = useMutation({
    mutationFn: () => updateCliente(id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cliente", id] });
      qc.invalidateQueries({ queryKey: ["clienti"] });
      toast.success("Cliente salvato");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: () => deleteCliente(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clienti"] });
      toast.success("Cliente eliminato");
      navigate({ to: "/clienti" });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  if (isLoading) {
    return <AppShell><div className="p-3 md:p-4 lg:p-6 text-sm text-muted-foreground">Caricamento…</div></AppShell>;
  }
  if (error || !cliente) {
    return (
      <AppShell>
        <div className="p-3 md:p-4 lg:p-6">
          <p className="text-sm text-destructive">
            {error ? (error as Error).message : "Cliente non trovato"}
          </p>
          <Link to="/clienti" className="mt-2 inline-flex items-center text-sm text-navy">
            <ArrowLeft className="mr-1 h-4 w-4" /> Torna ai clienti
          </Link>
        </div>
      </AppShell>
    );
  }

  function set<K extends keyof ClienteUpdate>(k: K, v: ClienteUpdate[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b bg-card px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to="/clienti" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-navy">{cliente.ragione_sociale}</h1>
                <p className="text-xs text-muted-foreground font-mono">
                  {cliente.id_cliente ?? "—"} {cliente.piva ? ` · P.IVA ${cliente.piva}` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDel(true)}>
                <Trash2 className="mr-1 h-4 w-4" /> Elimina
              </Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                <Save className="mr-1 h-4 w-4" /> Salva
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 md:p-4 lg:p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Anagrafica */}
            <section className="rounded-lg border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy">
                Anagrafica
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <Field label="Ragione sociale *" className="md:col-span-8">
                  <Input
                    value={form.ragione_sociale ?? ""}
                    onChange={(e) => set("ragione_sociale", e.target.value)}
                  />
                </Field>
                <Field label="ID cliente" className="md:col-span-4">
                  <Input
                    value={form.id_cliente ?? ""}
                    onChange={(e) => set("id_cliente", e.target.value || null)}
                    className="font-mono"
                  />
                </Field>
                <Field label="P.IVA" className="md:col-span-4">
                  <Input
                    value={form.piva ?? ""}
                    onChange={(e) => set("piva", e.target.value || null)}
                    className="font-mono"
                  />
                </Field>
                <Field label="Indirizzo" className="md:col-span-8">
                  <Input
                    value={form.indirizzo ?? ""}
                    onChange={(e) => set("indirizzo", e.target.value || null)}
                  />
                </Field>
                <Field label="Comune" className="md:col-span-6">
                  <ComunePicker
                    value={form.comune_id ?? null}
                    onChange={(id, prov) => {
                      set("comune_id", id);
                      if (prov) set("prov", prov);
                    }}
                  />
                </Field>
                <Field label="Prov" className="md:col-span-2">
                  <Input
                    value={form.prov ?? ""}
                    onChange={(e) => set("prov", e.target.value.toUpperCase() || null)}
                    maxLength={2}
                    className="font-mono"
                  />
                </Field>
                <Field label="CAP" className="md:col-span-2">
                  <Input
                    value={form.cap ?? ""}
                    onChange={(e) => set("cap", e.target.value || null)}
                    className="font-mono"
                  />
                </Field>
                <Field label="Filiale" className="md:col-span-2">
                  <Input
                    value={form.filiale ?? ""}
                    onChange={(e) => set("filiale", e.target.value || null)}
                  />
                </Field>
                <Field label="Agente" className="md:col-span-6">
                  <Select
                    value={form.agente_id ?? NONE}
                    onValueChange={(v) => set("agente_id", v === NONE ? null : v)}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Nessuno —</SelectItem>
                      {agenti.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Fascia listino default" className="md:col-span-6">
                  <Select
                    value={form.fascia_listino_default ?? NONE}
                    onValueChange={(v) =>
                      set("fascia_listino_default", v === NONE ? null : (v as FasciaListino))
                    }
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Nessuna —</SelectItem>
                      {FASCE.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </section>

            {/* Cantieri */}
            <CantieriSection clienteId={id} />
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              L'operazione è irreversibile. Eventuali cantieri e preventivi collegati potrebbero
              andare persi o restare senza riferimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => del.mutate()}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Cantieri section
// ----------------------------------------------------------------------------

function CantieriSection({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Cantiere | null>(null);
  const [open, setOpen] = useState(false);

  const { data: cantieri = [], isLoading, error } = useQuery({
    queryKey: ["cantieri", clienteId],
    queryFn: () => fetchCantieri(clienteId),
  });

  function onNew() { setEditing(null); setOpen(true); }
  function onEdit(c: Cantiere) { setEditing(c); setOpen(true); }

  const del = useMutation({
    mutationFn: (id: string) => deleteCantiere(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cantieri", clienteId] });
      toast.success("Cantiere eliminato");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-navy">
          Cantieri ({cantieri.length})
        </h2>
        <Button size="sm" onClick={onNew}>
          <Plus className="mr-1 h-4 w-4" /> Nuovo cantiere
        </Button>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Nome</th>
              <th className="px-3 py-2 font-semibold">Indirizzo</th>
              <th className="px-3 py-2 font-semibold">Comune</th>
              <th className="px-3 py-2 font-semibold">Prov</th>
              <th className="px-3 py-2 font-semibold">CAP</th>
              <th className="px-3 py-2 text-right font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-destructive">
                {(error as Error).message}
              </td></tr>
            ) : isLoading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                Caricamento…
              </td></tr>
            ) : cantieri.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                Nessun cantiere collegato.
              </td></tr>
            ) : (
              cantieri.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-medium">{c.nome}</td>
                  <td className="px-3 py-1.5">{c.indirizzo ?? "—"}</td>
                  <td className="px-3 py-1.5">{c.comune?.nome ?? "—"}</td>
                  <td className="px-3 py-1.5 font-mono">{c.prov ?? c.comune?.provincia ?? "—"}</td>
                  <td className="px-3 py-1.5 font-mono">{c.cap ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => onEdit(c)}
                        className="rounded p-1 text-navy hover:bg-muted"
                        title="Modifica"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Eliminare cantiere "${c.nome}"?`)) del.mutate(c.id);
                        }}
                        className="rounded p-1 text-destructive hover:bg-muted"
                        title="Elimina"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CantiereDialog
        open={open}
        onOpenChange={setOpen}
        clienteId={clienteId}
        cantiere={editing}
      />
    </section>
  );
}

function CantiereDialog({
  open,
  onOpenChange,
  clienteId,
  cantiere,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  clienteId: string;
  cantiere: Cantiere | null;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [comuneId, setComuneId] = useState<string | null>(null);
  const [prov, setProv] = useState("");
  const [cap, setCap] = useState("");

  useEffect(() => {
    if (open) {
      setNome(cantiere?.nome ?? "");
      setIndirizzo(cantiere?.indirizzo ?? "");
      setComuneId(cantiere?.comune_id ?? null);
      setProv(cantiere?.prov ?? "");
      setCap(cantiere?.cap ?? "");
    }
  }, [open, cantiere]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: nome.trim(),
        indirizzo: indirizzo.trim() || null,
        comune_id: comuneId,
        prov: prov.trim() || null,
        cap: cap.trim() || null,
      };
      if (cantiere) {
        return updateCantiere(cantiere.id, payload);
      }
      return createCantiere({ cliente_id: clienteId, ...payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cantieri", clienteId] });
      toast.success(cantiere ? "Cantiere aggiornato" : "Cantiere creato");
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cantiere ? "Modifica cantiere" : "Nuovo cantiere"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Indirizzo</Label>
            <Input value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Comune</Label>
            <ComunePicker
              value={comuneId}
              onChange={(id, p) => {
                setComuneId(id);
                if (p) setProv(p);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Prov</Label>
              <Input
                value={prov}
                onChange={(e) => setProv(e.target.value.toUpperCase())}
                maxLength={2}
                className="font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>CAP</Label>
              <Input value={cap} onChange={(e) => setCap(e.target.value)} className="font-mono" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={() => save.mutate()} disabled={!nome.trim() || save.isPending}>
            {cantiere ? "Salva" : "Crea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
