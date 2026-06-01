import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInputIt } from "@/components/ui/number-input-it";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArticoloPicker } from "@/components/kit/ArticoloPicker";
import {
  deleteCantiereListino,
  getArticoloConPrezziStandard,
  getCantiereListini,
  upsertCantiereListino,
  type ArticoloPrezziStandard,
  type CantiereListinoRow,
} from "@/lib/cantiere-listini-api";
import { formatNumeroIt } from "@/lib/numero-it";
import type { FasciaListino } from "@/lib/articoli-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function margineCalc(costo: number | null, prezzo: number | null): number | null {
  if (!prezzo || prezzo <= 0 || costo === null) return null;
  return ((prezzo - costo) / prezzo) * 100;
}

function margineColor(m: number | null): string {
  if (m === null) return "text-muted-foreground";
  if (m >= 30) return "text-emerald-600";
  if (m >= 15) return "text-amber-600";
  return "text-destructive";
}

const fmt = (v: number | null | undefined, dec = 5) =>
  v === null || v === undefined ? "—" : formatNumeroIt(v, { minDecimals: 2, maxDecimals: dec });

export function CantiereListiniSpecialiSection({
  cantiereId,
  fasciaCliente,
  fasciaIsDefault,
}: {
  cantiereId: string;
  fasciaCliente: FasciaListino;
  fasciaIsDefault: boolean;
}) {
  const qc = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["cantiere-listini", cantiereId, fasciaCliente],
    queryFn: () => getCantiereListini(cantiereId, fasciaCliente),
  });

  const upsert = useMutation({
    mutationFn: upsertCantiereListino,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cantiere-listini", cantiereId] }),
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteCantiereListino(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cantiere-listini", cantiereId] });
      toast.success("Listino speciale eliminato");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  function handleSave(
    r: CantiereListinoRow,
    patch: Partial<Pick<CantiereListinoRow, "costo_netto_speciale" | "prezzo_vendita_speciale" | "note">>,
  ) {
    upsert.mutate({
      id: r.id,
      cantiere_id: r.cantiere_id,
      cod_gamma: r.cod_gamma,
      costo_netto_speciale: patch.costo_netto_speciale !== undefined ? patch.costo_netto_speciale : r.costo_netto_speciale,
      prezzo_vendita_speciale: patch.prezzo_vendita_speciale !== undefined ? patch.prezzo_vendita_speciale : r.prezzo_vendita_speciale,
      note: patch.note !== undefined ? patch.note : r.note,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" onClick={() => setOpenAdd(true)}>
          <Plus className="mr-1 h-4 w-4" /> Aggiungi articolo
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {upsert.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          <span>
            {rows.length} {rows.length === 1 ? "articolo" : "articoli"} con prezzo speciale
            {" · "}fascia <span className="font-mono font-semibold">{fasciaCliente}</span>
            {fasciaIsDefault && " (nessuna fascia assegnata al cliente)"}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          Caricamento…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="mb-2 text-2xl">🏗️</div>
          <p className="text-sm font-medium">Nessun prezzo speciale per questo cantiere.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aggiungi articoli con condizioni particolari di acquisto o vendita.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setOpenAdd(true)}>
            <Plus className="mr-1 h-4 w-4" /> Aggiungi articolo
          </Button>
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border bg-card">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Articolo</th>
                <th className="px-3 py-2 font-semibold">UM</th>
                <th className="px-3 py-2 text-right font-semibold">Costo std</th>
                <th className="px-3 py-2 text-right font-semibold">Costo spec.</th>
                <th className="px-3 py-2 text-right font-semibold">Prezzo std</th>
                <th className="px-3 py-2 text-right font-semibold">Prezzo spec.</th>
                <th className="px-3 py-2 text-right font-semibold">Marg %</th>
                <th className="px-3 py-2 font-semibold">Note</th>
                <th className="px-3 py-2 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const costoDiff =
                  r.costo_netto_speciale !== null &&
                  r.costo_netto_standard !== null &&
                  r.costo_netto_speciale !== r.costo_netto_standard;
                const prezzoDiff =
                  r.prezzo_vendita_speciale !== null &&
                  r.prezzo_standard !== null &&
                  r.prezzo_vendita_speciale !== r.prezzo_standard;
                const m = margineCalc(r.costo_netto_speciale, r.prezzo_vendita_speciale);
                return (
                  <tr key={r.id} className="border-b align-middle hover:bg-muted/30">
                    <td className="max-w-[260px] px-3 py-1.5">
                      <div className="font-mono text-[11px] font-semibold text-navy">
                        {r.cod_gamma}
                      </div>
                      <div className="truncate text-muted-foreground" title={r.descrizione}>
                        {r.descrizione}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
                      {r.um || "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                      {fmt(r.costo_netto_standard)}
                    </td>
                    <td className="px-3 py-1.5">
                      <NumberInputIt
                        value={r.costo_netto_speciale ?? ""}
                        onChange={() => {}}
                        onBlur={(e) => {
                          const v = e.currentTarget.value;
                          const parsed = v.trim() === "" ? null : Number(v.replace(",", "."));
                          const newVal = parsed === null || !Number.isFinite(parsed) ? null : parsed;
                          if (newVal !== r.costo_netto_speciale) {
                            handleSave(r, { costo_netto_speciale: newVal });
                          }
                        }}
                        className={cn(
                          "h-7 w-28 px-2 text-right font-mono text-xs",
                          costoDiff && "border-navy ring-1 ring-navy/30",
                        )}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                      {fmt(r.prezzo_standard)}
                    </td>
                    <td className="px-3 py-1.5">
                      <NumberInputIt
                        value={r.prezzo_vendita_speciale ?? ""}
                        onChange={() => {}}
                        onBlur={(e) => {
                          const v = e.currentTarget.value;
                          const parsed = v.trim() === "" ? null : Number(v.replace(",", "."));
                          const newVal = parsed === null || !Number.isFinite(parsed) ? null : parsed;
                          if (newVal !== r.prezzo_vendita_speciale) {
                            handleSave(r, { prezzo_vendita_speciale: newVal });
                          }
                        }}
                        className={cn(
                          "h-7 w-28 px-2 text-right font-mono text-xs",
                          prezzoDiff && "border-navy ring-1 ring-navy/30",
                        )}
                      />
                    </td>
                    <td className={cn("px-3 py-1.5 text-right font-mono font-semibold", margineColor(m))}>
                      {m === null ? "—" : `${formatNumeroIt(m, { minDecimals: 1, maxDecimals: 1 })}%`}
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        defaultValue={r.note ?? ""}
                        onBlur={(e) => {
                          const v = e.currentTarget.value.trim() || null;
                          if (v !== r.note) handleSave(r, { note: v });
                        }}
                        className="h-7 px-2 text-xs"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Eliminare il listino speciale per ${r.cod_gamma}?`))
                            del.mutate(r.id);
                        }}
                        className="rounded p-1 text-destructive hover:bg-muted"
                        title="Elimina"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddArticoloDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        cantiereId={cantiereId}
        fasciaCliente={fasciaCliente}
        codiciEsistenti={useMemo(() => new Set(rows.map((r) => r.cod_gamma)), [rows])}
      />
    </div>
  );
}

function AddArticoloDialog({
  open,
  onOpenChange,
  cantiereId,
  fasciaCliente,
  codiciEsistenti,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  cantiereId: string;
  fasciaCliente: FasciaListino;
  codiciEsistenti: Set<string>;
}) {
  const qc = useQueryClient();
  const [articoloId, setArticoloId] = useState<string | null>(null);
  const [codGamma, setCodGamma] = useState<string | null>(null);
  const [std, setStd] = useState<ArticoloPrezziStandard | null>(null);
  const [costo, setCosto] = useState<number | null>(null);
  const [prezzo, setPrezzo] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [duplicato, setDuplicato] = useState(false);
  const [loading, setLoading] = useState(false);

  function reset() {
    setArticoloId(null);
    setCodGamma(null);
    setStd(null);
    setCosto(null);
    setPrezzo(null);
    setNote("");
    setDuplicato(false);
  }

  const save = useMutation({
    mutationFn: () =>
      upsertCantiereListino({
        cantiere_id: cantiereId,
        cod_gamma: codGamma!,
        costo_netto_speciale: costo,
        prezzo_vendita_speciale: prezzo,
        note: note.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cantiere-listini", cantiereId] });
      toast.success("Listino speciale aggiunto");
      reset();
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const margineLive = margineCalc(costo, prezzo);

  return (
    <Dialog
      open={open}
      onOpenChange={(b) => {
        if (!b) reset();
        onOpenChange(b);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aggiungi articolo a listini speciali</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Articolo</Label>
            <ArticoloPicker
              value={articoloId}
              onChange={async (id, art) => {
                setArticoloId(id);
                const cod = art?.cod_gamma ?? null;
                setCodGamma(cod);
                if (cod && codiciEsistenti.has(cod)) {
                  setDuplicato(true);
                  setStd(null);
                  return;
                }
                setDuplicato(false);
                if (!cod) return;
                setLoading(true);
                try {
                  const s = await getArticoloConPrezziStandard(cod, fasciaCliente);
                  setStd(s);
                  setCosto(s?.costo_netto ?? null);
                  setPrezzo(s?.prezzo_standard ?? null);
                } finally {
                  setLoading(false);
                }
              }}
              placeholder="Cerca articolo per codice o descrizione…"
            />
          </div>

          {duplicato && (
            <div className="rounded border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Articolo già presente in questo cantiere. Modificalo direttamente nella tabella.
            </div>
          )}

          {loading && (
            <div className="text-xs text-muted-foreground">Caricamento prezzi standard…</div>
          )}

          {std && !duplicato && (
            <>
              <div className="rounded border bg-muted/30 p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Riferimento standard
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Descrizione: </span>
                    <span className="font-medium">{std.descrizione}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">UM: </span>
                    <span className="font-mono">{std.um || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Categoria: </span>
                    <span>{std.categoria ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Listino fornitore: </span>
                    <span className="font-mono">{std.listino_for ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Costo standard: </span>
                    <span className="font-mono">{fmt(std.costo_netto)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Prezzo standard ({fasciaCliente}): </span>
                    <span className="font-mono">{fmt(std.prezzo_standard)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Margine standard: </span>
                    <span className={cn("font-mono font-semibold", margineColor(std.margine_standard))}>
                      {std.margine_standard === null
                        ? "—"
                        : `${formatNumeroIt(std.margine_standard, { minDecimals: 1, maxDecimals: 1 })}%`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs font-semibold text-navy">▼ Prezzi speciali cantiere</div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Costo speciale
                  </Label>
                  <NumberInputIt
                    value={costo ?? ""}
                    onChange={(v) => setCosto(v)}
                    className="font-mono"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Prezzo speciale
                  </Label>
                  <NumberInputIt
                    value={prezzo ?? ""}
                    onChange={(v) => setPrezzo(v)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="text-xs">
                <span className="text-muted-foreground">Margine speciale: </span>
                <span className={cn("font-mono font-semibold", margineColor(margineLive))}>
                  {margineLive === null
                    ? "—"
                    : `${formatNumeroIt(margineLive, { minDecimals: 1, maxDecimals: 1 })}%`}
                </span>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Note</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="es. promo trimestre, sconto cantiere…"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!codGamma || duplicato || save.isPending || !std}
          >
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
