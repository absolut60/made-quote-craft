import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL_EXTRACT = "google/gemini-2.5-flash";
const MODEL_ANSWER = "google/gemini-2.5-pro";

async function callAI(apiKey: string, body: unknown): Promise<unknown> {
  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    if (resp.status === 429) throw new Error("Troppi tentativi, riprova tra poco.");
    if (resp.status === 402) throw new Error("Crediti AI esauriti per il workspace.");
    const t = await resp.text();
    console.error("AI gateway error", resp.status, t);
    throw new Error(`AI gateway error ${resp.status}`);
  }
  return resp.json();
}

const EXTRACT_SYSTEM = `Sei un assistente che interpreta domande in italiano su un catalogo di prodotti edilizia/cartongesso.
Estrai dalla domanda i criteri di filtro. Rispondi SOLO chiamando "extract_criteri".
- fornitore: nome se citato (Knauf, Rockwool, Siniat, Saint-Gobain, ...), altrimenti null
- categoria: codice (A, B, C, I, M, ...) se la domanda nomina chiaramente una categoria nota; altrimenti null
- termini: parole chiave utili per cercare nella descrizione (escluso fornitore/categoria già riconosciuti). Includi sigle prodotto, tipologie (ignifuga, idro, fonoassorbente), materiali.
- spessore_min / spessore_max: in mm se la domanda specifica un range (es. "sopra i 12mm" → spessore_min: 12), altrimenti null.`;

export const chiediAssistente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChiediInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY non configurata");
    const { supabase } = context;

    // --- Carica contesto leggero: fornitori + matrice ricarichi (categorie) ---
    const [fornRes, matRes] = await Promise.all([
      supabase.from("fornitori").select("ragione_sociale").limit(500),
      supabase
        .from("matrice_ricarichi")
        .select("categoria, descrizione_categoria, macro_gruppo")
        .limit(200),
    ]);
    const fornitori = (fornRes.data ?? []).map((f) => f.ragione_sociale).filter(Boolean);
    const matrice = matRes.data ?? [];

    // --- Step 1: estrazione criteri ---
    const extractBody = {
      model: MODEL_EXTRACT,
      messages: [
        { role: "system", content: EXTRACT_SYSTEM },
        {
          role: "user",
          content: `Fornitori noti: ${fornitori.join(", ")}
Categorie note: ${matrice.map((c) => `${c.categoria}=${c.descrizione_categoria ?? ""}`).join("; ")}

Domanda: "${data.domanda}"`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_criteri",
            description: "Estrae i criteri di filtro dalla domanda",
            parameters: {
              type: "object",
              properties: {
                fornitore: { type: ["string", "null"] },
                categoria: { type: ["string", "null"] },
                termini: { type: "array", items: { type: "string" } },
                spessore_min: { type: ["number", "null"] },
                spessore_max: { type: ["number", "null"] },
              },
              required: ["termini"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_criteri" } },
    };

    const extractJson = (await callAI(apiKey, extractBody)) as {
      choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
    };
    const extractCall = extractJson?.choices?.[0]?.message?.tool_calls?.[0];
    let criteri: CriteriEstratti = {
      fornitore: null,
      categoria: null,
      termini: [],
      spessore_min: null,
      spessore_max: null,
    };
    try {
      const parsed = JSON.parse(extractCall?.function?.arguments ?? "{}");
      criteri = {
        fornitore: parsed.fornitore ?? null,
        categoria: parsed.categoria ?? null,
        termini: Array.isArray(parsed.termini) ? parsed.termini : [],
        spessore_min: typeof parsed.spessore_min === "number" ? parsed.spessore_min : null,
        spessore_max: typeof parsed.spessore_max === "number" ? parsed.spessore_max : null,
      };
    } catch {
      // ignore, criteri vuoti
    }

    // --- Step 2: query articoli ---
    let q = supabase
      .from("articoli")
      .select(
        `id, cod_gamma, cod_fornitore, descrizione, um, categoria, tipologia, note_acquisto,
         fornitore:fornitori(ragione_sociale),
         listini_acquisto:listini_acquisto(costo_netto, data_validita),
         listini_vendita:listini_vendita(fascia, prezzo)`,
      )
      .limit(80);

    if (criteri.categoria) q = q.eq("categoria", criteri.categoria);

    if (criteri.fornitore) {
      const { data: fid } = await supabase
        .from("fornitori")
        .select("id")
        .ilike("ragione_sociale", `%${criteri.fornitore}%`)
        .limit(1)
        .maybeSingle();
      if (fid?.id) q = q.eq("fornitore_id", fid.id);
    }

    if (criteri.termini.length > 0) {
      const orParts = criteri.termini
        .slice(0, 5)
        .map((t) => t.replace(/[%,]/g, " ").trim())
        .filter(Boolean)
        .map((t) => `descrizione.ilike.%${t}%`);
      if (orParts.length) q = q.or(orParts.join(","));
    }

    const { data: arts, error: artsErr } = await q;
    if (artsErr) throw artsErr;

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

    // --- Step 3: risposta finale ---
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

    const history = (data.storico ?? []).map((m) => ({ role: m.role, content: m.content }));
    const answerBody = {
      model: MODEL_ANSWER,
      messages: [
        { role: "system", content: answerSystem },
        ...history,
        { role: "user", content: data.domanda },
      ],
    };
    const answerJson = (await callAI(apiKey, answerBody)) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const risposta =
      answerJson?.choices?.[0]?.message?.content ?? "Nessuna risposta generata.";

    return { risposta, criteri, fonti, totale_trovati: arts?.length ?? 0 };
  });

function fmt(n: number | null): string {
  if (n == null) return "—";
  return `€ ${n.toFixed(2).replace(".", ",")}`;
}

export type AssistenteRisposta = Awaited<ReturnType<typeof chiediAssistente>>;
