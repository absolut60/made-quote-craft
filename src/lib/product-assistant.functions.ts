import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClaude, extractText, extractToolUse } from "./ai-claude.server";

const ChiediInput = z.object({
  domanda: z.string().min(1).max(2000),
  storico: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});

type CriteriEstratti = {
  fornitore: string | null;
  categoria: string | null;
  termini: string[];
  spessore_min: number | null;
  spessore_max: number | null;
};

type Fonte = {
  id: string;
  cod_gamma: string | null;
  descrizione: string;
  fornitore: string | null;
  categoria: string | null;
  um: string | null;
  prezzo_A: number | null;
  prezzo_B: number | null;
  prezzo_C: number | null;
  costo_netto: number | null;
};

const EXTRACT_SYSTEM = `Sei un assistente che interpreta domande in italiano su un catalogo di prodotti edilizia/cartongesso.
Estrai dalla domanda i criteri di filtro. Rispondi SOLO chiamando lo strumento "extract_criteri".
- fornitore: nome se citato (Knauf, Rockwool, Siniat, Saint-Gobain, ...), altrimenti null
- categoria: codice (A, B, C, I, M, ...) se la domanda nomina chiaramente una categoria nota; altrimenti null
- termini: parole chiave utili per cercare nella descrizione (escluso fornitore/categoria già riconosciuti). Includi sigle prodotto, tipologie (ignifuga, idro, fonoassorbente), materiali.
- spessore_min / spessore_max: in mm se la domanda specifica un range (es. "sopra i 12mm" → spessore_min: 12), altrimenti null.`;

const EXTRACT_TOOL = {
  name: "extract_criteri",
  description: "Estrae i criteri di filtro dalla domanda",
  input_schema: {
    type: "object",
    properties: {
      fornitore: { type: ["string", "null"] },
      categoria: { type: ["string", "null"] },
      termini: { type: "array", items: { type: "string" } },
      spessore_min: { type: ["number", "null"] },
      spessore_max: { type: ["number", "null"] },
    },
    required: ["termini"],
  },
};

export const chiediAssistente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChiediInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // --- Carica contesto leggero: fornitori + matrice ricarichi ---
    const [fornRes, matRes] = await Promise.all([
      supabase.from("fornitori").select("ragione_sociale").limit(500),
      supabase
        .from("matrice_ricarichi")
        .select("categoria, descrizione_categoria, macro_gruppo")
        .limit(200),
    ]);
    const fornitori = (fornRes.data ?? []).map((f) => f.ragione_sociale).filter(Boolean);
    const matrice = matRes.data ?? [];

    // --- Step 1: estrazione criteri con Claude (tool use) ---
    const extractResp = await callClaude({
      system: EXTRACT_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Fornitori noti: ${fornitori.join(", ")}
Categorie note: ${matrice.map((c) => `${c.categoria}=${c.descrizione_categoria ?? ""}`).join("; ")}

Domanda: "${data.domanda}"`,
        },
      ],
      max_tokens: 512,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extract_criteri" },
    });

    const parsed = extractToolUse<Partial<CriteriEstratti>>(extractResp, "extract_criteri");
    const criteri: CriteriEstratti = {
      fornitore: parsed?.fornitore ?? null,
      categoria: parsed?.categoria ?? null,
      termini: Array.isArray(parsed?.termini) ? parsed!.termini! : [],
      spessore_min: typeof parsed?.spessore_min === "number" ? parsed.spessore_min : null,
      spessore_max: typeof parsed?.spessore_max === "number" ? parsed.spessore_max : null,
    };

    // --- Step 2: query articoli ---
    // Risolvi fornitore_id (case-insensitive, trim)
    let fornitoreId: string | null = null;
    let fornitoreNomeReale: string | null = null;
    if (criteri.fornitore) {
      const nome = criteri.fornitore.trim();
      const { data: fid } = await supabase
        .from("fornitori")
        .select("id, ragione_sociale")
        .ilike("ragione_sociale", `%${nome}%`)
        .limit(1)
        .maybeSingle();
      if (fid?.id) {
        fornitoreId = fid.id;
        fornitoreNomeReale = fid.ragione_sociale;
      }
    }

    // Normalizza categoria (codice singolo, uppercase)
    const categoriaCode = criteri.categoria ? criteri.categoria.trim().toUpperCase() : null;

    // Trova descrizione categoria per escludere termini ridondanti
    const descCategoria = categoriaCode
      ? (matrice.find((c) => c.categoria === categoriaCode)?.descrizione_categoria ?? "")
      : "";

    // Parole "consumate" da fornitore/categoria — non vanno ricercate come termini
    const stop = new Set<string>();
    const addStop = (s: string | null) => {
      if (!s) return;
      s.toLowerCase()
        .split(/[\s,_\-/]+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 3)
        .forEach((w) => stop.add(w));
    };
    addStop(criteri.fornitore);
    addStop(fornitoreNomeReale);
    addStop(descCategoria);
    // Termini generici che non aiutano in descrizione
    ["prezzo", "prezzi", "fascia", "listino", "articoli", "prodotti"].forEach((w) => stop.add(w));

    const terminiPuliti = criteri.termini
      .map((t) => t.replace(/[%,]/g, " ").trim())
      .filter(Boolean)
      .filter((t) => !stop.has(t.toLowerCase()))
      // scarta numeri puri / sigle spessore (es. "13", "12,5", "SP") — sono raffinamento morbido
      .filter((t) => !/^(sp\.?|mm)?\s*\d+([.,]\d+)?\s*(mm)?$/i.test(t));

    const baseSelect = `id, cod_gamma, cod_fornitore, descrizione, um, categoria, tipologia, note_acquisto,
       fornitore:fornitori(ragione_sociale),
       listini_acquisto:listini_acquisto(costo_netto, data_validita),
       listini_vendita:listini_vendita(fascia, prezzo)`;

    const buildQuery = (withTermini: boolean) => {
      let q = supabase.from("articoli").select(baseSelect).limit(80);
      if (categoriaCode) q = q.ilike("categoria", categoriaCode);
      if (fornitoreId) q = q.eq("fornitore_id", fornitoreId);
      if (withTermini && terminiPuliti.length > 0) {
        const orParts = terminiPuliti
          .slice(0, 5)
          .map((t) => `descrizione.ilike.%${t}%`);
        q = q.or(orParts.join(","));
      }
      return q;
    };

    // Primo tentativo: con tutti i filtri
    let { data: arts, error: artsErr } = await buildQuery(true);
    if (artsErr) throw artsErr;

    // Fallback: se i termini azzerano ma fornitore/categoria avrebbero risultati, droppali
    if ((!arts || arts.length === 0) && terminiPuliti.length > 0 && (fornitoreId || categoriaCode)) {
      const fb = await buildQuery(false);
      if (!fb.error && fb.data && fb.data.length > 0) arts = fb.data;
    }

    // Ordinamento "soft" per pertinenza ai termini residui (inclusi quelli scartati come numeri)
    const rankTerms = criteri.termini
      .map((t) => t.toLowerCase().trim())
      .filter(Boolean)
      .filter((t) => !stop.has(t));
    if (rankTerms.length > 0 && arts && arts.length > 0) {
      arts = [...arts].sort((a, b) => {
        const da = (a.descrizione ?? "").toLowerCase();
        const db = (b.descrizione ?? "").toLowerCase();
        const sa = rankTerms.reduce((n, t) => n + (da.includes(t) ? 1 : 0), 0);
        const sb = rankTerms.reduce((n, t) => n + (db.includes(t) ? 1 : 0), 0);
        return sb - sa;
      });
    }

    // --- Costruisci fonti compatte ---
    const fonti: Fonte[] = (arts ?? []).slice(0, 40).map((a) => {
      const la = (a.listini_acquisto ?? [])
        .slice()
        .sort((x, y) => (y.data_validita ?? "").localeCompare(x.data_validita ?? ""));
      const costo = la[0]?.costo_netto ?? null;
      const findP = (f: string) =>
        (a.listini_vendita ?? []).find((l) => l.fascia === f)?.prezzo ?? null;
      return {
        id: a.id,
        cod_gamma: a.cod_gamma,
        descrizione: a.descrizione,
        fornitore: (a.fornitore as { ragione_sociale?: string } | null)?.ragione_sociale ?? null,
        categoria: a.categoria,
        um: a.um,
        prezzo_A: findP("A"),
        prezzo_B: findP("B"),
        prezzo_C: findP("C"),
        costo_netto: costo,
      };
    });

    // --- Step 3: risposta finale con Claude ---
    const datiCompatti = fonti
      .map(
        (f) =>
          `- [${f.cod_gamma ?? "—"}] ${f.descrizione} | for: ${f.fornitore ?? "—"} | cat: ${f.categoria ?? "—"} | um: ${f.um ?? "—"} | A: ${fmt(f.prezzo_A)} | B: ${fmt(f.prezzo_B)} | C: ${fmt(f.prezzo_C)} | costo: ${fmt(f.costo_netto)}`,
      )
      .join("\n");

    const categorieDesc = matrice
      .map((c) => `${c.categoria} = ${c.descrizione_categoria ?? ""} (${c.macro_gruppo ?? ""})`)
      .join("\n");

    const answerSystem = `Sei un assistente che risponde a domande sul catalogo prodotti di un'azienda di edilizia (Sistema MADE).
REGOLE FERREE:
- Rispondi SOLO usando i dati prodotti forniti qui sotto e le descrizioni delle categorie.
- Cita sempre i codici (cod_gamma) e i prezzi reali quando rilevanti.
- Formato prezzi italiano: € 12,50 (virgola decimale).
- Se l'informazione richiesta non è presente nei dati, dillo esplicitamente. NON inventare prodotti, prezzi o caratteristiche.
- Se ci sono pochi risultati pertinenti, dillo ed elenca quello che hai.
- Sii conciso, usa elenchi puntati o tabelle markdown quando aiuta.

Descrizioni categorie:
${categorieDesc}

Prodotti rilevanti (max 40, filtrati dai criteri estratti):
${datiCompatti || "(nessun prodotto trovato con questi criteri)"}`;

    const history = (data.storico ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const answerResp = await callClaude({
      system: answerSystem,
      messages: [...history, { role: "user", content: data.domanda }],
      max_tokens: 1500,
    });
    const risposta = extractText(answerResp) || "Nessuna risposta generata.";

    return { risposta, criteri, fonti, totale_trovati: arts?.length ?? 0 };
  });

function fmt(n: number | null): string {
  if (n == null) return "—";
  return `€ ${n.toFixed(2).replace(".", ",")}`;
}

export type AssistenteRisposta = Awaited<ReturnType<typeof chiediAssistente>>;
