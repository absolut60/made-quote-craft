import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, FileDown, GripVertical, Plus, Save, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  calcolaBlocco, calcolaTotaliPreventivo, deleteBlocco, deletePreventivo, fetchAgenti, fetchCliente, fetchPreventivo,
  reorderBlocchi, ricalcolaBloccoSuNuovaQuantita, STATI, STATI_LABEL, TIPI_DOC, TIPI_DOC_LABEL,
  updateBlocco, updatePreventivo,
  type BloccoConRighe, type StatoPreventivo, type TipoDoc,
} from "@/lib/preventivi-api";

import { FASCE, type FasciaListino } from "@/lib/articoli-api";
import { round2 } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { AggiungiBloccoDialog } from "@/components/preventivi/AggiungiBloccoDialog";
import { RigheTable } from "@/components/preventivi/RigheTable";
import { GeneraDocumentoDialog } from "@/components/preventivi/GeneraDocumentoDialog";
import { ClientePicker } from "@/components/preventivi/ClientePicker";
import { CantierePicker } from "@/components/preventivi/CantierePicker";
import { AllegatiButton } from "@/components/preventivi/AllegatiSection";

export const Route = createFileRoute("/preventivi/$id")({
  head: () => ({ meta: [{ title: "Editor Preventivo — Sistema MADE" }] }),
  component: PreventivoEditorPage,
});

function PreventivoEditorPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [addBloccoOpen, setAddBloccoOpen] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);

  const { data: prev, isLoading } = useQuery({
    queryKey: ["preventivo", id],
    queryFn: () => fetchPreventivo(id),
  });

  const { data: agenti = [] } = useQuery({ queryKey: ["agenti"], queryFn: fetchAgenti });

  async function onChangeCliente(nuovoId: string | null) {
    if (!nuovoId) {
      save.mutate({ cliente_id: null, cantiere_id: null });
      return;
    }
    const c = await fetchCliente(nuovoId);
    save.mutate({
      cliente_id: nuovoId,
      cantiere_id: null,
      agente_id: c?.agente_id ?? null,
      filiale: c?.filiale ?? null,
      ...(c?.fascia_listino_default ? { fascia_listino: c.fascia_listino_default } : {}),
    });
  }


  const invalidate = () => qc.invalidateQueries({ queryKey: ["preventivo", id] });

  const save = useMutation({
    mutationFn: (patch: Parameters<typeof updatePreventivo>[1]) => updatePreventivo(id, patch),
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const delPrev = useMutation({
    mutationFn: () => deletePreventivo(id),
    onSuccess: () => { toast.success("Preventivo eliminato"); navigate({ to: "/preventivi" }); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const totali = useMemo(() => {
    if (!prev) return { imponibile: 0, iva: 0, totale: 0 };
    return calcolaTotaliPreventivo(
      prev.blocchi.map((b) => ({
        righe: b.righe,
        quantita_base: b.quantita_base,
        prezzo_um: b.prezzo_um,
        importo: b.importo,
      })),
      Number(prev.iva_perc ?? 22),
    );
  }, [prev]);

  const margineTotale = useMemo(() => {
    let costo = 0, vendita = 0;
    for (const b of prev?.blocchi ?? []) {
      const c = calcolaBlocco(b.righe);
      costo += c.costo;
      vendita += c.totale;
    }
    const euro = vendita - costo;
    const perc = vendita > 0 ? (euro / vendita) * 100 : 0;
    return { costo, vendita, euro: round2(euro), perc: round2(perc) };
  }, [prev]);

  // Persist totali in DB (fire and forget) when cambiano significativamente
  const saveTotali = useMutation({
    mutationFn: (t: { imponibile: number; iva: number; totale: number }) =>
      updatePreventivo(id, {
        totale_imponibile: t.imponibile,
        iva_importo: t.iva,
        totale: t.totale,
      }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEndBlocchi(e: DragEndEvent) {
    if (!prev) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = prev.blocchi.findIndex((b) => b.id === active.id);
    const newIdx = prev.blocchi.findIndex((b) => b.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = [...prev.blocchi];
    const [m] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, m);
    reorderBlocchi(reordered.map((b, i) => ({ id: b.id, ordine: (i + 1) * 10 }))).then(invalidate);
  }

  if (isLoading || !prev) {
    return <AppShell><div className="p-3 md:p-4 lg:p-6 text-sm text-muted-foreground">Caricamento…</div></AppShell>;
  }

  const lastOrdine = prev.blocchi.length
    ? Number(prev.blocchi[prev.blocchi.length - 1].ordine ?? 0)
    : 0;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-3 md:p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/preventivi"><ArrowLeft className="mr-1 h-4 w-4" /> Preventivi</Link>
            </Button>
            <h1 className="text-xl font-semibold">{prev.numero ?? "Nuovo preventivo"}</h1>
            <Badge variant={prev.stato === "confermato" ? "default" : prev.stato === "inviato" ? "secondary" : "outline"}>
              {STATI_LABEL[prev.stato]}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AllegatiButton preventivoId={id} />
            <Button size="sm" onClick={() => setOutputOpen(true)}>
              <FileDown className="mr-1 h-4 w-4" /> Genera documento
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveTotali.mutate(totali)}
              disabled={saveTotali.isPending}
            >
              <Save className="mr-1 h-4 w-4" /> Salva totali
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive">
                  <Trash2 className="mr-1 h-4 w-4" /> Elimina
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminare il preventivo?</AlertDialogTitle>
                  <AlertDialogDescription>Tutti i blocchi e le righe verranno eliminati. Irreversibile.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={() => delPrev.mutate()}>Elimina</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Intestazione preventivo */}
        <Card>
          <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Numero</Label>
              <Input defaultValue={prev.numero ?? ""}
                onBlur={(e) => {
                  if ((e.target.value || null) !== prev.numero)
                    save.mutate({ numero: e.target.value || null });
                }} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Data</Label>
              <Input type="date" defaultValue={prev.data}
                onBlur={(e) => { if (e.target.value && e.target.value !== prev.data) save.mutate({ data: e.target.value }); }} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Validità</Label>
              <Input type="date" defaultValue={prev.validita ?? ""}
                onBlur={(e) => { if ((e.target.value || null) !== prev.validita) save.mutate({ validita: e.target.value || null }); }} />
            </div>
            <div className="grid gap-1.5 md:col-span-3 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Cliente</Label>
                <ClientePicker
                  value={prev.cliente_id ?? null}
                  onChange={(id) => save.mutate({ cliente_id: id, cantiere_id: null })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Cantiere</Label>
                <CantierePicker
                  cliente_id={prev.cliente_id ?? null}
                  value={prev.cantiere_id ?? null}
                  onChange={(id) => save.mutate({ cantiere_id: id })}
                />
              </div>
              <div className="md:col-span-2 text-xs text-muted-foreground">
                Agente: {prev.agente?.nome ?? "—"} · Filiale: {prev.filiale ?? "—"}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Tipo documento</Label>
              <Select value={prev.tipo_doc} onValueChange={(v) => save.mutate({ tipo_doc: v as TipoDoc })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPI_DOC.map((t) => (
                    <SelectItem key={t} value={t}>{TIPI_DOC_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Fascia listino</Label>
              <Select value={prev.fascia_listino ?? "A"} onValueChange={(v) => save.mutate({ fascia_listino: v as FasciaListino })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FASCE.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Stato</Label>
              <Select value={prev.stato} onValueChange={(v) => save.mutate({ stato: v as StatoPreventivo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATI.map((s) => <SelectItem key={s} value={s}>{STATI_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">IVA %</Label>
              <Input type="number" step="0.01" defaultValue={prev.iva_perc ?? 22}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v !== Number(prev.iva_perc ?? 22)) save.mutate({ iva_perc: v });
                }} />
            </div>
            <div className="grid gap-1.5 md:col-span-3">
              <Label className="text-xs">Note</Label>
              <Textarea rows={2} defaultValue={prev.note ?? ""}
                onBlur={(e) => { if ((e.target.value || null) !== prev.note) save.mutate({ note: e.target.value || null }); }} />
            </div>
          </CardContent>
        </Card>

        {/* Blocchi */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Blocchi ({prev.blocchi.length})
          </h2>
          <Button size="sm" onClick={() => setAddBloccoOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Aggiungi blocco
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndBlocchi}>
          <SortableContext items={prev.blocchi.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-4">
              {prev.blocchi.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
                    <p className="text-sm text-muted-foreground">Nessun blocco. Aggiungine uno per iniziare.</p>
                    <Button size="sm" onClick={() => setAddBloccoOpen(true)}>
                      <Plus className="mr-1 h-4 w-4" /> Aggiungi blocco
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                prev.blocchi.map((b, idx) => (
                  <BloccoCard key={b.id} blocco={b} index={idx} preventivoId={id} fascia={(prev.fascia_listino ?? "A") as FasciaListino} />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>


        {/* Totali */}
        <Card>
          <CardContent className="space-y-2 p-4">
            <Totale
              label="Margine"
              value={`${margineTotale.perc.toFixed(1)}% · € ${margineTotale.euro.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              className={margineTotale.perc >= 0 ? "text-[#009246]" : "text-destructive"}
            />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Totale label="Imponibile" value={`€ ${totali.imponibile.toFixed(2)}`} />
              <Totale label={`IVA ${Number(prev.iva_perc ?? 22)}%`} value={`€ ${totali.iva.toFixed(2)}`} />
              <Totale label="Totale" value={`€ ${totali.totale.toFixed(2)}`} strong />
            </div>
          </CardContent>
        </Card>
      </div>

      <AggiungiBloccoDialog
        open={addBloccoOpen}
        onOpenChange={setAddBloccoOpen}
        preventivoId={id}
        fascia={(prev.fascia_listino ?? "A") as FasciaListino}
        lastOrdine={lastOrdine}
      />

      <GeneraDocumentoDialog open={outputOpen} onOpenChange={setOutputOpen} prev={prev} />
    </AppShell>
  );
}

function Totale({ label, value, strong, className }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className={cn(strong ? "rounded bg-primary/10 p-3" : "p-3", className)}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("font-mono", strong ? "text-2xl font-bold" : "text-lg")}>{value}</div>
    </div>
  );
}

function BloccoCard({
  blocco, index, preventivoId, fascia,
}: { blocco: BloccoConRighe; index: number; preventivoId: string; fascia: FasciaListino }) {
  const qc = useQueryClient();
  const sortable = useSortable({ id: blocco.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  };

  const calc = useMemo(() => calcolaBlocco(blocco.righe), [blocco.righe]);
  const totaleBlocco = calc.totale || Number(blocco.importo ?? 0);
  const prezzoUm =
    Number(blocco.quantita_base ?? 0) > 0
      ? round2(totaleBlocco / Number(blocco.quantita_base))
      : Number(blocco.prezzo_um ?? 0);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["preventivo", preventivoId] });

  const upd = useMutation({
    mutationFn: (patch: Parameters<typeof updateBlocco>[1]) => updateBlocco(blocco.id, patch),
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const recalcQta = useMutation({
    mutationFn: (v: number | null) =>
      ricalcolaBloccoSuNuovaQuantita(blocco.id, v, blocco.righe),
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: () => deleteBlocco(blocco.id),
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <div ref={sortable.setNodeRef} style={style}>
      <Card>
        <CardContent className="space-y-3 p-0">
          {/* Header blocco */}
          <div className="flex flex-wrap items-start gap-3 border-b bg-muted/30 p-3">
            <button {...sortable.attributes} {...sortable.listeners} className="cursor-grab pt-2" title="Trascina">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="text-sm font-semibold text-muted-foreground">#{index + 1}</div>
            <div className="grid w-24 gap-1">
              <Label className="text-[10px] uppercase">Rif.</Label>
              <Input
                defaultValue={blocco.rif_capitolato ?? ""}
                onBlur={(e) => { if ((e.target.value || null) !== blocco.rif_capitolato) upd.mutate({ rif_capitolato: e.target.value || null }); }}
                className="h-8 font-mono font-semibold"
                placeholder="PA.AR.08"
              />
            </div>
            <div className="grid flex-1 min-w-[200px] gap-1">
              <Label className="text-[10px] uppercase">Descrizione</Label>
              <Input
                defaultValue={blocco.descrizione ?? ""}
                onBlur={(e) => { if ((e.target.value || null) !== blocco.descrizione) upd.mutate({ descrizione: e.target.value || null }); }}
                className="h-8 font-medium"
              />
            </div>
            <div className="grid w-24 gap-1">
              <Label className="text-[10px] uppercase">Quantità</Label>
              <Input
                type="number" step="0.01"
                defaultValue={blocco.quantita_base ?? 0}
                onBlur={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  if (v !== (blocco.quantita_base == null ? null : Number(blocco.quantita_base)))
                    recalcQta.mutate(v);
                }}
                className="h-8 text-right font-mono"
              />
            </div>
            <div className="grid w-16 gap-1">
              <Label className="text-[10px] uppercase">U.M.</Label>
              <Input
                defaultValue={blocco.um_base ?? "mq"}
                onBlur={(e) => { if (e.target.value && e.target.value !== blocco.um_base) upd.mutate({ um_base: e.target.value }); }}
                className="h-8"
              />
            </div>
            <div className="grid w-24 gap-1 text-right">
              <Label className="text-[10px] uppercase">Prezzo / {blocco.um_base}</Label>
              <div className="h-8 rounded border bg-card px-2 py-1 text-right font-mono text-sm">
                € {prezzoUm.toFixed(2)}
              </div>
            </div>
            <div className="grid w-28 gap-1 text-right">
              <Label className="text-[10px] uppercase">Importo</Label>
              <div className="h-8 rounded border bg-primary/10 px-2 py-1 text-right font-mono text-sm font-semibold">
                € {totaleBlocco.toFixed(2)}
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="mt-5 h-8 w-8 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminare il blocco?</AlertDialogTitle>
                  <AlertDialogDescription>Verranno eliminate anche tutte le righe del blocco.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={() => del.mutate()}>Elimina</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {blocco.note_tecniche && (
            <div className="px-3 text-xs italic text-muted-foreground">
              {blocco.note_tecniche}
            </div>
          )}

          <RigheTable blocco={blocco} preventivoId={preventivoId} fascia={fascia} />
        </CardContent>
      </Card>
    </div>
  );
}
