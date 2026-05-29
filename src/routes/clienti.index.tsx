import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import {
  createCliente,
  fetchAgenti,
  fetchClienti,
  fetchClientiFacets,
  FASCE,
  type FasciaListino,
} from "@/lib/clienti-api";
import { Eye, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/clienti/")({
  head: () => ({ meta: [{ title: "Clienti — Sistema MADE" }] }),
  component: ClientiListPage,
});

const ANY = "__any";

function ClientiListPage() {
  const [search, setSearch] = useState("");
  const [debSearch, setDebSearch] = useState("");
  const [agenteId, setAgenteId] = useState<string | null>(null);
  const [filiale, setFiliale] = useState<string | null>(null);
  const [fascia, setFascia] = useState<FasciaListino | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [mostraFiltri, setMostraFiltri] = useState(false);
  const nFiltriAttivi = [agenteId, filiale, fascia].filter(Boolean).length;

  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo(
    () => ({ search: debSearch, agente_id: agenteId, filiale, fascia }),
    [debSearch, agenteId, filiale, fascia],
  );

  const { data: clienti = [], isLoading, error } = useQuery({
    queryKey: ["clienti", filters],
    queryFn: () => fetchClienti(filters, 1000),
  });

  const { data: agenti = [] } = useQuery({ queryKey: ["agenti"], queryFn: fetchAgenti });
  const { data: facets } = useQuery({ queryKey: ["clienti-facets"], queryFn: fetchClientiFacets });

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b bg-card px-3 py-3 lg:px-6 lg:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 lg:gap-3">
            <div>
              <h1 className="text-lg font-bold text-navy lg:text-xl">Clienti</h1>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Caricamento…" : `${clienti.length} record`}
              </p>
            </div>
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4 lg:mr-1" />
              <span className="hidden sm:inline">Nuovo cliente</span>
            </Button>
          </div>

          {/* Search + Filtri toggle (mobile) */}
          <div className="mt-3 flex items-center gap-2 lg:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca ragione sociale, ID o P.IVA…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setMostraFiltri((v) => !v)}
            >
              <SlidersHorizontal className="mr-1 h-4 w-4" /> Filtri
              {nFiltriAttivi > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-[10px]">{nFiltriAttivi}</Badge>
              )}
            </Button>
          </div>

          {/* Filters */}
          <div
            className={cn(
              "mt-2 gap-2 lg:mt-4 lg:grid lg:grid-cols-12",
              mostraFiltri ? "grid grid-cols-2" : "hidden",
            )}
          >
            <div className="relative hidden lg:col-span-5 lg:block">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca ragione sociale, ID cliente o P.IVA…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>
            <div className="lg:col-span-3">
              <Select value={agenteId ?? ANY} onValueChange={(v) => setAgenteId(v === ANY ? null : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Agente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Tutti gli agenti</SelectItem>
                  {agenti.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select value={filiale ?? ANY} onValueChange={(v) => setFiliale(v === ANY ? null : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Filiale" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Tutte</SelectItem>
                  {(facets?.filiali ?? []).map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select value={fascia ?? ANY} onValueChange={(v) => setFascia(v === ANY ? null : (v as FasciaListino))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Fascia" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Tutte fasce</SelectItem>
                  {FASCE.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>


        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-navy text-navy-foreground">
              <tr className="text-left text-[11px] uppercase tracking-wide">
                <th className="px-3 py-2 font-semibold">Ragione sociale</th>
                <th className="px-3 py-2 font-semibold">ID cliente</th>
                <th className="px-3 py-2 font-semibold">P.IVA</th>
                <th className="px-3 py-2 font-semibold">Comune</th>
                <th className="px-3 py-2 font-semibold">Prov</th>
                <th className="px-3 py-2 font-semibold">Filiale</th>
                <th className="px-3 py-2 font-semibold">Agente</th>
                <th className="px-3 py-2 font-semibold">Fascia</th>
                <th className="px-3 py-2 text-right font-semibold">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr><td colSpan={9} className="px-3 py-12 text-center text-destructive">
                  Errore: {(error as Error).message}
                </td></tr>
              ) : isLoading ? (
                <tr><td colSpan={9} className="px-3 py-12 text-center text-muted-foreground">
                  Caricamento…
                </td></tr>
              ) : clienti.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-12 text-center text-muted-foreground">
                  Nessun cliente trovato.
                </td></tr>
              ) : (
                clienti.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-1.5 font-medium">{c.ragione_sociale}</td>
                    <td className="px-3 py-1.5 font-mono">{c.id_cliente ?? "—"}</td>
                    <td className="px-3 py-1.5 font-mono">{c.piva ?? "—"}</td>
                    <td className="px-3 py-1.5">{c.comune?.nome ?? "—"}</td>
                    <td className="px-3 py-1.5 font-mono">{c.prov ?? c.comune?.provincia ?? "—"}</td>
                    <td className="px-3 py-1.5">{c.filiale ?? "—"}</td>
                    <td className="px-3 py-1.5">{c.agente?.nome ?? "—"}</td>
                    <td className="px-3 py-1.5 font-mono">{c.fascia_listino_default ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right">
                      <Link
                        to="/clienti/$id"
                        params={{ id: c.id }}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-navy hover:bg-muted"
                      >
                        <Eye className="h-3 w-3" /> Apri
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NuovoClienteDialog open={newOpen} onOpenChange={setNewOpen} />
    </AppShell>
  );
}

function NuovoClienteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [ragioneSociale, setRagioneSociale] = useState("");
  const [idCliente, setIdCliente] = useState("");

  useEffect(() => {
    if (!open) { setRagioneSociale(""); setIdCliente(""); }
  }, [open]);

  const create = useMutation({
    mutationFn: () => createCliente({
      ragione_sociale: ragioneSociale.trim(),
      id_cliente: idCliente.trim() || null,
    }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["clienti"] });
      toast.success("Cliente creato");
      onOpenChange(false);
      navigate({ to: "/clienti/$id", params: { id: c.id } });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuovo cliente</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Ragione sociale *</Label>
            <Input value={ragioneSociale} onChange={(e) => setRagioneSociale(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>ID cliente</Label>
            <Input value={idCliente} onChange={(e) => setIdCliente(e.target.value)} className="font-mono" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={() => create.mutate()} disabled={!ragioneSociale.trim() || create.isPending}>
            Crea e apri
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
