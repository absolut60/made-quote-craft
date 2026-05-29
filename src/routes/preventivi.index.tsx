import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, Plus, Search, Trash2 } from "lucide-react";
import {
  deletePreventivo, fetchPreventivi, STATI, STATI_LABEL, TIPI_DOC, TIPI_DOC_LABEL,
  type StatoPreventivo, type TipoDoc,
} from "@/lib/preventivi-api";
import { searchClienti } from "@/lib/preventivi-api";
import { NuovoPreventivoDialog } from "@/components/preventivi/NuovoPreventivoDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/preventivi/")({
  head: () => ({ meta: [{ title: "Preventivi — Sistema MADE" }] }),
  component: PreventiviListPage,
});

const ANY = "__any";

function PreventiviListPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dSearch, setDSearch] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [stato, setStato] = useState<StatoPreventivo | null>(null);
  const [tipoDoc, setTipoDoc] = useState<TipoDoc | null>(null);
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo(
    () => ({ search: dSearch, cliente_id: clienteId, stato, tipo_doc: tipoDoc }),
    [dSearch, clienteId, stato, tipoDoc],
  );

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["preventivi", filters],
    queryFn: () => fetchPreventivi(filters),
  });

  const { data: clienti = [] } = useQuery({
    queryKey: ["clienti-list"],
    queryFn: () => searchClienti(""),
  });

  const del = useMutation({
    mutationFn: (id: string) => deletePreventivo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      toast.success("Preventivo eliminato");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-3 md:p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Preventivi</h1>
            <p className="text-sm text-muted-foreground">Documenti commerciali per cantiere</p>
          </div>
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nuovo preventivo
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per numero…"
              className="pl-8"
            />
          </div>
          <Select value={clienteId ?? ANY} onValueChange={(v) => setClienteId(v === ANY ? null : v)}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Tutti i clienti</SelectItem>
              {clienti.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.ragione_sociale}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stato ?? ANY} onValueChange={(v) => setStato(v === ANY ? null : (v as StatoPreventivo))}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Stato" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Tutti gli stati</SelectItem>
              {STATI.map((s) => (
                <SelectItem key={s} value={s}>{STATI_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tipoDoc ?? ANY} onValueChange={(v) => setTipoDoc(v === ANY ? null : (v as TipoDoc))}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Tipo doc" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Tutti i tipi</SelectItem>
              {TIPI_DOC.map((t) => (
                <SelectItem key={t} value={t}>{TIPI_DOC_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="text-xs uppercase tracking-wide">
                <TableHead className="w-32">Numero</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Cantiere</TableHead>
                <TableHead className="w-28">Data</TableHead>
                <TableHead className="w-40">Tipo doc</TableHead>
                <TableHead className="w-28">Stato</TableHead>
                <TableHead className="w-32 text-right">Totale</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">Caricamento…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">Nessun preventivo.</TableCell></TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} className="text-sm">
                    <TableCell className="font-mono">{r.numero ?? "—"}</TableCell>
                    <TableCell className="truncate">{r.cliente?.ragione_sociale ?? "—"}</TableCell>
                    <TableCell className="truncate text-muted-foreground">{r.cantiere?.nome ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.data}</TableCell>
                    <TableCell className="text-xs">{TIPI_DOC_LABEL[r.tipo_doc]}</TableCell>
                    <TableCell>
                      <Badge variant={r.stato === "confermato" ? "default" : r.stato === "inviato" ? "secondary" : "outline"}>
                        {STATI_LABEL[r.stato]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">€ {Number(r.totale ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" className="h-7 w-7">
                          <Link to="/preventivi/$id" params={{ id: r.id }}><Eye className="h-3.5 w-3.5" /></Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare il preventivo?</AlertDialogTitle>
                              <AlertDialogDescription>Verranno eliminati anche tutti i blocchi e le righe. Operazione irreversibile.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(r.id)}>Elimina</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <NuovoPreventivoDialog open={openNew} onOpenChange={setOpenNew} />
    </AppShell>
  );
}
