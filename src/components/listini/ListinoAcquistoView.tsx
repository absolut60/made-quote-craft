import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchFornitori, type ListinoAcquisto } from "@/lib/articoli-api";
import { calcCosto } from "@/lib/pricing";
import { EditableNumberCell } from "./EditableNumberCell";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface ArticoloLite {
  id: string;
  cod_gamma: string | null;
  descrizione: string;
  fornitore_id: string | null;
}
interface ListinoRow extends ListinoAcquisto {}

const ANY = "__any";

export function ListinoAcquistoView() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dSearch, setDSearch] = useState("");
  const [fornId, setFornId] = useState<string | null>(null);
  const [dataFrom, setDataFrom] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => setDSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: fornitori = [] } = useQuery({
    queryKey: ["fornitori"],
    queryFn: fetchFornitori,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["listini-acquisto-view", dSearch, fornId, dataFrom],
    queryFn: async () => {
      // 1. Articoli filtrati
      let aq = supabase
        .from("articoli")
        .select("id, cod_gamma, descrizione, fornitore_id")
        .order("cod_gamma", { ascending: true, nullsFirst: false })
        .limit(1500);
      if (dSearch.trim()) {
        const s = dSearch.trim().replace(/[%,]/g, " ");
        aq = aq.or(`cod_gamma.ilike.%${s}%,descrizione.ilike.%${s}%`);
      }
      if (fornId) aq = aq.eq("fornitore_id", fornId);
      const { data: arts, error: aErr } = await aq;
      if (aErr) throw aErr;
      const articoli = (arts ?? []) as ArticoloLite[];
      if (!articoli.length) return { articoli: [], byArt: new Map<string, ListinoRow>() };

      // 2. Listini acquisto per quegli articoli (chunk da 100 per evitare limite URL)
      const ids = articoli.map((a) => a.id);
      const CHUNK = 100;
      const all: ListinoRow[] = [];
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        let lq = supabase.from("listini_acquisto").select("*").in("articolo_id", chunk);
        if (dataFrom) lq = lq.gte("data_validita", dataFrom);
        const { data: lists, error: lErr } = await lq;
        if (lErr) throw lErr;
        all.push(...((lists ?? []) as ListinoRow[]));
      }

      // 3. Mantieni solo la riga più recente per articolo
      const byArt = new Map<string, ListinoRow>();
      for (const r of all) {
        const cur = byArt.get(r.articolo_id);
        if (!cur) {
          byArt.set(r.articolo_id, r);
        } else {
          const a = (r.data_validita ?? "") + r.created_at;
          const b = (cur.data_validita ?? "") + cur.created_at;
          if (a > b) byArt.set(r.articolo_id, r);
        }
      }
      return { articoli, byArt };
    },
  });

  const fornitoriById = useMemo(
    () => new Map(fornitori.map((f) => [f.id, f.ragione_sociale])),
    [fornitori],
  );

  async function patchOrInsert(
    articoloId: string,
    existing: ListinoRow | undefined,
    patch: Partial<ListinoRow>,
  ) {
    const merged: Partial<ListinoRow> = { ...(existing ?? {}), ...patch };
    const calc = calcCosto(merged);
    const payload = {
      articolo_id: articoloId,
      costo: merged.costo ?? null,
      sc1: merged.sc1 ?? null,
      sc2: merged.sc2 ?? null,
      sc3: merged.sc3 ?? null,
      sc4: merged.sc4 ?? null,
      sc5: merged.sc5 ?? null,
      trasporto_eur: merged.trasporto_eur ?? null,
      trasporto_perc: merged.trasporto_perc ?? null,
      data_validita: merged.data_validita ?? null,
      listino_for: merged.listino_for ?? null,
      condizioni: merged.condizioni ?? null,
      costo_parziale: calc.costo_parziale,
      costo_netto: calc.costo_netto,
    };
    try {
      if (existing) {
        const { error } = await supabase
          .from("listini_acquisto")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("listini_acquisto").insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["listini-acquisto-view"] });
      qc.invalidateQueries({ queryKey: ["listini_acquisto", articoloId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore salvataggio");
      refetch();
    }
  }

  const articoli = data?.articoli ?? [];
  const byArt = data?.byArt ?? new Map<string, ListinoRow>();

  return (
    <div className="flex h-full flex-col">
      {/* Filters */}
      <div className="border-b bg-card px-6 py-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca cod. GAMMA o descrizione…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 font-mono text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <Select value={fornId ?? ANY} onValueChange={(v) => setFornId(v === ANY ? null : v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Fornitore" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Tutti i fornitori</SelectItem>
                {fornitori.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.ragione_sociale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Input
              type="date"
              value={dataFrom}
              onChange={(e) => setDataFrom(e.target.value)}
              className="h-9 font-mono text-xs"
              placeholder="Data da"
            />
          </div>
          <div className="md:col-span-2 flex items-center text-xs text-muted-foreground">
            {isLoading ? "Caricamento…" : `${articoli.length} articoli`}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-navy text-navy-foreground">
            <tr className="text-[11px] uppercase tracking-wide">
              <th className="px-3 py-2 text-left">Cod. GAMMA</th>
              <th className="px-3 py-2 text-left">Descrizione</th>
              <th className="px-3 py-2 text-left">Fornitore</th>
              <th className="px-2 py-2 text-right">Costo</th>
              <th className="px-2 py-2 text-right">SC1</th>
              <th className="px-2 py-2 text-right">SC2</th>
              <th className="px-2 py-2 text-right">SC3</th>
              <th className="px-2 py-2 text-right">SC4</th>
              <th className="px-2 py-2 text-right">SC5</th>
              <th className="px-2 py-2 text-right">Trasp.€</th>
              <th className="px-2 py-2 text-right">Trasp.%</th>
              <th className="px-2 py-2 text-right bg-navy/80">COSTO NETTO</th>
              <th className="px-2 py-2 text-left">Data</th>
            </tr>
          </thead>
          <tbody>
            {articoli.map((a) => {
              const l = byArt.get(a.id);
              const live = l ? calcCosto(l) : { costo_parziale: 0, costo_netto: 0 };
              return (
                <tr key={a.id} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-1 font-mono">{a.cod_gamma ?? "—"}</td>
                  <td className="px-3 py-1 max-w-[28ch] truncate" title={a.descrizione}>
                    {a.descrizione}
                  </td>
                  <td className="px-3 py-1">
                    {a.fornitore_id ? fornitoriById.get(a.fornitore_id) ?? "—" : "—"}
                  </td>
                  <td className="px-1 py-0.5">
                    <EditableNumberCell
                      value={l?.costo ?? null}
                      onCommit={(v) => patchOrInsert(a.id, l, { costo: v })}
                    />
                  </td>
                  {(["sc1", "sc2", "sc3", "sc4", "sc5"] as const).map((k) => (
                    <td key={k} className="px-1 py-0.5">
                      <EditableNumberCell
                        value={(l?.[k] as number | null | undefined) ?? null}
                        onCommit={(v) => patchOrInsert(a.id, l, { [k]: v } as Partial<ListinoRow>)}
                      />
                    </td>
                  ))}
                  <td className="px-1 py-0.5">
                    <EditableNumberCell
                      value={l?.trasporto_eur ?? null}
                      onCommit={(v) => patchOrInsert(a.id, l, { trasporto_eur: v })}
                    />
                  </td>
                  <td className="px-1 py-0.5">
                    <EditableNumberCell
                      value={l?.trasporto_perc ?? null}
                      onCommit={(v) => patchOrInsert(a.id, l, { trasporto_perc: v })}
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-mono font-bold bg-muted/30">
                    {live.costo_netto ? `€ ${live.costo_netto.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-2 py-1 font-mono text-[11px]">{l?.data_validita ?? "—"}</td>
                </tr>
              );
            })}
            {!isLoading && !articoli.length && (
              <tr>
                <td colSpan={13} className="px-3 py-12 text-center text-muted-foreground">
                  Nessun articolo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
