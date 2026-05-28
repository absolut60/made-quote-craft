import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  fetchListiniAcquisto,
  insertListinoAcquisto,
  deleteListinoAcquisto,
  calcCostoNetto,
  type ListinoAcquisto,
} from "@/lib/articoli-api";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function ListinoAcquistoSection({
  articoloId,
  onActiveCostoNetto,
}: {
  articoloId: string;
  onActiveCostoNetto?: (v: number) => void;
}) {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["listini_acquisto", articoloId],
    queryFn: () => fetchListiniAcquisto(articoloId),
  });

  const [draft, setDraft] = useState<Partial<ListinoAcquisto>>({});

  const active = rows[0];
  useEffect(() => {
    if (active && onActiveCostoNetto) {
      const cn = Number(active.costo_netto ?? calcCostoNetto(active).costo_netto);
      if (cn) onActiveCostoNetto(cn);
    }
  }, [active, onActiveCostoNetto]);


  const insertMut = useMutation({
    mutationFn: async () => {
      const calc = calcCostoNetto(draft);
      return insertListinoAcquisto({
        articolo_id: articoloId,
        costo: draft.costo ?? 0,
        sc1: draft.sc1 ?? null,
        sc2: draft.sc2 ?? null,
        sc3: draft.sc3 ?? null,
        sc4: draft.sc4 ?? null,
        sc5: draft.sc5 ?? null,
        trasporto_eur: draft.trasporto_eur ?? null,
        trasporto_perc: draft.trasporto_perc ?? null,
        costo_parziale: calc.costo_parziale,
        costo_netto: calc.costo_netto,
        data_validita: draft.data_validita ?? null,
        listino_for: draft.listino_for ?? null,
        condizioni: draft.condizioni ?? null,
        note: draft.note ?? null,
      });
    },
    onSuccess: () => {
      toast.success("Riga di listino aggiunta");
      setDraft({});
      qc.invalidateQueries({ queryKey: ["listini_acquisto", articoloId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore"),
  });

  const delMut = useMutation({
    mutationFn: deleteListinoAcquisto,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listini_acquisto", articoloId] }),
  });

  const draftCalc = calcCostoNetto(draft);

  return (
    <div className="space-y-4">
      {/* Chain panel */}
      <div className="rounded-lg border bg-card p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Catena di calcolo costo (riga attiva)
        </div>
        {active ? (
          <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
            <Pill label="COSTO" value={fmt(active.costo)} />
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Pill
              label="SC1..SC5"
              value={[active.sc1, active.sc2, active.sc3, active.sc4, active.sc5]
                .map((s) => (s ? `${s}%` : "—"))
                .join(" · ")}
            />
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Pill label="PARZIALE" value={fmt(active.costo_parziale ?? calcCostoNetto(active).costo_parziale)} />
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Pill
              label="TRASPORTO"
              value={`${fmt(active.trasporto_eur)} € + ${active.trasporto_perc ?? 0}%`}
            />
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <div className="rounded bg-navy px-3 py-1.5 text-navy-foreground">
              <div className="text-[10px] uppercase opacity-80">Costo netto</div>
              <div className="font-mono text-base font-bold">
                € {fmt(active.costo_netto ?? calcCostoNetto(active).costo_netto)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Nessun listino di acquisto inserito.</div>
        )}
      </div>

      {/* Historic table */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h4 className="text-sm font-semibold">Storico listini acquisto</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="px-2 py-1.5 text-left">Data</th>
                <th className="px-2 py-1.5 text-left">List. for.</th>
                <th className="px-2 py-1.5 text-right">Costo</th>
                <th className="px-2 py-1.5 text-right">SC1</th>
                <th className="px-2 py-1.5 text-right">SC2</th>
                <th className="px-2 py-1.5 text-right">SC3</th>
                <th className="px-2 py-1.5 text-right">SC4</th>
                <th className="px-2 py-1.5 text-right">SC5</th>
                <th className="px-2 py-1.5 text-right">Trasp.€</th>
                <th className="px-2 py-1.5 text-right">Trasp.%</th>
                <th className="px-2 py-1.5 text-right">Parziale</th>
                <th className="px-2 py-1.5 text-right">Netto</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="px-2 py-4 text-center text-muted-foreground">
                    Caricamento…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-2 py-4 text-center text-muted-foreground">
                    Nessuna riga
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-2 py-1.5">{r.data_validita ?? "—"}</td>
                    <td className="px-2 py-1.5">{r.listino_for ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right">{fmt(r.costo)}</td>
                    <td className="px-2 py-1.5 text-right">{r.sc1 ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right">{r.sc2 ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right">{r.sc3 ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right">{r.sc4 ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right">{r.sc5 ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right">{fmt(r.trasporto_eur)}</td>
                    <td className="px-2 py-1.5 text-right">{r.trasporto_perc ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right">{fmt(r.costo_parziale)}</td>
                    <td className="px-2 py-1.5 text-right font-bold">{fmt(r.costo_netto)}</td>
                    <td className="px-2 py-1.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => delMut.mutate(r.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add new row */}
      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm font-semibold mb-3">Aggiungi nuova riga di listino</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <NumField label="Costo" value={draft.costo} onChange={(v) => setDraft({ ...draft, costo: v })} />
          <NumField label="SC1 %" value={draft.sc1} onChange={(v) => setDraft({ ...draft, sc1: v })} />
          <NumField label="SC2 %" value={draft.sc2} onChange={(v) => setDraft({ ...draft, sc2: v })} />
          <NumField label="SC3 %" value={draft.sc3} onChange={(v) => setDraft({ ...draft, sc3: v })} />
          <NumField label="SC4 %" value={draft.sc4} onChange={(v) => setDraft({ ...draft, sc4: v })} />
          <NumField label="SC5 %" value={draft.sc5} onChange={(v) => setDraft({ ...draft, sc5: v })} />
          <NumField
            label="Trasporto €"
            value={draft.trasporto_eur}
            onChange={(v) => setDraft({ ...draft, trasporto_eur: v })}
          />
          <NumField
            label="Trasporto %"
            value={draft.trasporto_perc}
            onChange={(v) => setDraft({ ...draft, trasporto_perc: v })}
          />
          <div>
            <label className="text-[11px] uppercase text-muted-foreground">Data validità</label>
            <Input
              type="date"
              value={draft.data_validita ?? ""}
              onChange={(e) => setDraft({ ...draft, data_validita: e.target.value || null })}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase text-muted-foreground">List. for.</label>
            <Input
              value={draft.listino_for ?? ""}
              onChange={(e) => setDraft({ ...draft, listino_for: e.target.value })}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="col-span-2 flex items-end gap-2">
            <div className="flex-1 rounded border bg-muted/40 px-3 py-2 font-mono text-xs">
              <span className="text-muted-foreground">Parziale:</span>{" "}
              <span className="font-semibold">{fmt(draftCalc.costo_parziale)}</span>
              {"  "}
              <span className="text-muted-foreground ml-2">Netto:</span>{" "}
              <span className="font-bold">{fmt(draftCalc.costo_netto)}</span>
            </div>
            <Button
              size="sm"
              onClick={() => insertMut.mutate()}
              disabled={!draft.costo || insertMut.isPending}
            >
              <Plus className="mr-1 h-3 w-3" /> Aggiungi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/40 px-2 py-1">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-xs">{value}</div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase text-muted-foreground">{label}</label>
      <Input
        type="number"
        step="0.01"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="h-8 font-mono text-xs"
      />
    </div>
  );
}
