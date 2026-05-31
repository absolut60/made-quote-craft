import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Loader2, Send, X, Trash2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { interpretaVoce, type RigaEstratta } from "@/lib/voice-order.functions";

export const Route = createFileRoute("/ordine-vocale")({
  component: OrdineVocalePage,
  head: () => ({ meta: [{ title: "Ordine vocale (beta) — Sistema MADE" }] }),
});

type Candidato = {
  id: string;
  cod_gamma: string | null;
  cod_fornitore: string | null;
  descrizione: string;
  um: string | null;
  categoria: string | null;
  fornitore_nome: string | null;
  score: number;
};

type GruppoRicerca = {
  id: string;
  riga: RigaEstratta;
  candidati: Candidato[];
  loading: boolean;
};

type RigaConfermata = {
  id: string;
  articolo_id: string;
  cod_gamma: string | null;
  descrizione: string;
  quantita: number;
  um: string;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9, ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function cercaCandidati(
  riga: RigaEstratta,
  fornitoriMap: Map<string, string>, // nome upper -> id
): Promise<Candidato[]> {
  let q = supabase
    .from("articoli")
    .select("id, cod_gamma, cod_fornitore, descrizione, um, categoria, fornitore:fornitori(id, ragione_sociale)")
    .eq("stato", "attivo")
    .limit(80);

  if (riga.fornitore_riconosciuto) {
    const forId = fornitoriMap.get(riga.fornitore_riconosciuto.toUpperCase());
    if (forId) q = q.eq("fornitore_id", forId);
  }
  if (riga.categoria_riconosciuta) {
    q = q.eq("categoria", riga.categoria_riconosciuta);
  }

  // Match testuale: il primo termine come ilike "and", poi rank lato client
  const termini = (riga.termini_ricerca ?? []).filter((t) => t && t.length >= 2);
  if (termini.length > 0) {
    q = q.ilike("descrizione", `%${termini[0]}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error(error);
    return [];
  }

  // Score: numero di termini che matchano la descrizione (normalizzata)
  const rows = (data ?? []).map((r) => {
    const desc = normalize(r.descrizione ?? "");
    let score = 0;
    for (const t of termini) if (desc.includes(normalize(t))) score += 1;
    if (riga.spessore && desc.includes(normalize(riga.spessore))) score += 2;
    if (riga.dimensione && desc.includes(normalize(riga.dimensione))) score += 2;
    return {
      id: r.id,
      cod_gamma: r.cod_gamma,
      cod_fornitore: r.cod_fornitore,
      descrizione: r.descrizione,
      um: r.um,
      categoria: r.categoria,
      fornitore_nome: r.fornitore?.ragione_sociale ?? null,
      score,
    } satisfies Candidato;
  });

  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, 5);
}

function OrdineVocalePage() {
  const router = useRouter();
  void router;
  const interpreta = useServerFn(interpretaVoce);

  const [supported, setSupported] = useState<boolean>(true);
  const [listening, setListening] = useState(false);
  const [testo, setTesto] = useState("");
  const [interim, setInterim] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [gruppi, setGruppi] = useState<GruppoRicerca[]>([]);
  const [confermate, setConfermate] = useState<RigaConfermata[]>([]);
  const [fornitori, setFornitori] = useState<{ id: string; ragione_sociale: string }[]>([]);
  const [categorie, setCategorie] = useState<{ codice: string; descrizione: string }[]>([]);

  const recogRef = useRef<any>(null);

  useEffect(() => {
    const SR: any =
      (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SR) {
      setSupported(false);
      return;
    }
    const r = new SR();
    r.lang = "it-IT";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (event: any) => {
      let final = "";
      let inter = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) final += res[0].transcript;
        else inter += res[0].transcript;
      }
      if (final) setTesto((prev) => (prev ? prev + " " : "") + final.trim());
      setInterim(inter);
    };
    r.onerror = (e: any) => {
      console.error("Speech error", e);
      if (e.error === "not-allowed") toast.error("Permesso microfono negato");
      else if (e.error === "no-speech") { /* ignore */ }
      else toast.error("Errore riconoscimento: " + e.error);
      setListening(false);
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    recogRef.current = r;
    return () => {
      try { r.stop(); } catch { /* */ }
    };
  }, []);

  // Carica fornitori + categorie all'avvio
  useEffect(() => {
    (async () => {
      const [forn, cat] = await Promise.all([
        supabase.from("fornitori").select("id, ragione_sociale").order("ragione_sociale"),
        supabase.from("matrice_ricarichi").select("categoria, descrizione_categoria").order("categoria"),
      ]);
      if (forn.data) setFornitori(forn.data);
      if (cat.data) {
        setCategorie(
          cat.data
            .filter((c) => c.descrizione_categoria && c.descrizione_categoria.trim())
            .map((c) => ({ codice: c.categoria, descrizione: c.descrizione_categoria as string })),
        );
      }
    })();
  }, []);

  const fornitoriMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of fornitori) m.set(f.ragione_sociale.toUpperCase(), f.id);
    return m;
  }, [fornitori]);

  function toggleMic() {
    if (!supported || !recogRef.current) return;
    if (listening) {
      try { recogRef.current.stop(); } catch { /* */ }
      setListening(false);
    } else {
      setInterim("");
      try {
        recogRef.current.start();
        setListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  }

  async function handleInterpreta() {
    const txt = testo.trim();
    if (!txt) { toast.error("Niente da interpretare"); return; }
    setInterpreting(true);
    setGruppi([]);
    try {
      const res = await interpreta({
        data: {
          testo: txt,
          fornitori: fornitori.map((f) => f.ragione_sociale),
          categorie: categorie,
        },
      });
      const righe = (res.righe ?? []) as RigaEstratta[];
      if (righe.length === 0) {
        toast.error("Nessuna riga estratta");
        return;
      }
      const nuoviGruppi: GruppoRicerca[] = righe.map((r, i) => ({
        id: `g-${Date.now()}-${i}`,
        riga: r,
        candidati: [],
        loading: true,
      }));
      setGruppi(nuoviGruppi);

      // Cerca candidati in parallelo
      const risultati = await Promise.all(righe.map((r) => cercaCandidati(r, fornitoriMap)));
      setGruppi((prev) =>
        prev.map((g, i) => ({ ...g, candidati: risultati[i] ?? [], loading: false })),
      );
    } catch (e) {
      console.error(e);
      toast.error("Errore AI: " + (e as Error).message);
    } finally {
      setInterpreting(false);
    }
  }

  function confermaCandidato(g: GruppoRicerca, c: Candidato) {
    setConfermate((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}-${Math.random()}`,
        articolo_id: c.id,
        cod_gamma: c.cod_gamma,
        descrizione: c.descrizione,
        quantita: g.riga.quantita ?? 1,
        um: g.riga.unita_misura ?? c.um ?? "",
      },
    ]);
    setGruppi((prev) => prev.filter((x) => x.id !== g.id));
    toast.success("Riga aggiunta");
  }

  function rimuoviGruppo(id: string) {
    setGruppi((prev) => prev.filter((g) => g.id !== id));
  }

  function rimuoviConfermata(id: string) {
    setConfermate((prev) => prev.filter((c) => c.id !== id));
  }

  function reset() {
    setTesto("");
    setInterim("");
    setGruppi([]);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl p-4 pb-32">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Ordine vocale <span className="text-xs uppercase tracking-wider text-muted-foreground">beta</span></h1>
          <p className="text-sm text-muted-foreground mt-1">
            Prototipo isolato. Premi il microfono, detta gli articoli, l'AI interpreta e propone i candidati.
          </p>
        </div>

        {!supported && (
          <Card className="p-4 mb-4 border-destructive/40 bg-destructive/5 text-sm">
            Il riconoscimento vocale non è supportato su questo browser. Usa Chrome (preferibilmente su mobile/desktop) oppure digita il testo manualmente qui sotto.
          </Card>
        )}

        {/* Microfono */}
        <div className="flex flex-col items-center gap-3 py-6">
          <button
            onClick={toggleMic}
            disabled={!supported}
            className={`h-28 w-28 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
              listening ? "bg-destructive text-white animate-pulse" : "bg-primary text-primary-foreground"
            } disabled:opacity-40`}
            aria-label={listening ? "Stop" : "Parla"}
          >
            {listening ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
          </button>
          <div className="text-xs text-muted-foreground">
            {listening ? "In ascolto… tocca per fermare" : "Tocca per iniziare a parlare"}
          </div>
        </div>

        {/* Trascrizione editabile */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Testo trascritto (modificabile)</label>
          <Textarea
            rows={4}
            value={testo + (interim ? ` ${interim}` : "")}
            onChange={(e) => { setTesto(e.target.value); setInterim(""); }}
            placeholder='es. "idrolastra 12,5 da 3 metri, 50 metri quadri"'
            className="text-base"
          />
          <div className="flex gap-2">
            <Button onClick={handleInterpreta} disabled={interpreting || !testo.trim()} className="flex-1">
              {interpreting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Interpretazione…</> : <><Sparkles className="h-4 w-4 mr-2" /> Interpreta</>}
            </Button>
            <Button variant="outline" onClick={reset} disabled={interpreting}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Gruppi candidati */}
        {gruppi.length > 0 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Candidati</h2>
            {gruppi.map((g) => (
              <Card key={g.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs space-y-1 flex-1">
                    <div className="flex flex-wrap gap-1">
                      {g.riga.fornitore_riconosciuto && <Badge variant="secondary">Fornitore: {g.riga.fornitore_riconosciuto}</Badge>}
                      {g.riga.categoria_riconosciuta && <Badge variant="secondary">Cat: {g.riga.categoria_riconosciuta}</Badge>}
                      {g.riga.quantita != null && <Badge>Q.tà: {g.riga.quantita} {g.riga.unita_misura ?? ""}</Badge>}
                      {g.riga.spessore && <Badge variant="outline">Sp. {g.riga.spessore}</Badge>}
                      {g.riga.dimensione && <Badge variant="outline">{g.riga.dimensione}</Badge>}
                    </div>
                    <div className="text-muted-foreground">
                      Termini: {(g.riga.termini_ricerca ?? []).join(", ") || "—"}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => rimuoviGruppo(g.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  {g.loading && <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Ricerca…</div>}
                  {!g.loading && g.candidati.length === 0 && (
                    <div className="text-sm text-muted-foreground">Nessun candidato. Modifica il testo e riprova.</div>
                  )}
                  {g.candidati.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => confermaCandidato(g, c)}
                      className="w-full text-left rounded-md border border-border p-3 hover:bg-accent transition-colors active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs text-muted-foreground">{c.cod_gamma ?? c.cod_fornitore ?? "—"}</div>
                          <div className="text-sm font-medium truncate">{c.descrizione}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {c.fornitore_nome ?? "—"}{c.um ? ` · ${c.um}` : ""}{c.categoria ? ` · cat ${c.categoria}` : ""}
                          </div>
                        </div>
                        <Plus className="h-5 w-5 text-primary shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Lista confermate */}
        {confermate.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Lista temporanea ({confermate.length})
            </h2>
            <Card className="divide-y">
              {confermate.map((r) => (
                <div key={r.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-muted-foreground">{r.cod_gamma ?? "—"}</div>
                    <div className="text-sm truncate">{r.descrizione}</div>
                  </div>
                  <Input
                    type="number"
                    value={r.quantita}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setConfermate((prev) => prev.map((x) => x.id === r.id ? { ...x, quantita: Number.isFinite(v) ? v : 0 } : x));
                    }}
                    className="w-20 h-9 text-right"
                  />
                  <div className="text-xs text-muted-foreground w-10">{r.um}</div>
                  <Button size="icon" variant="ghost" onClick={() => rimuoviConfermata(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </Card>
            <p className="text-xs text-muted-foreground mt-2">
              Prototipo: la lista resta a schermo per valutare il riconoscimento. L'integrazione con ordini reali sarà un passaggio successivo.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
