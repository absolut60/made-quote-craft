import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClaude, extractToolUse } from "./ai-claude.server";

const InterpretInput = z.object({
  testo: z.string().min(1).max(2000),
  fornitori: z.array(z.string()).max(500),
  categorie: z.array(z.object({ codice: z.string(), descrizione: z.string() })).max(100),
});

const SYSTEM = `Sei un assistente che interpreta richieste vocali di ordine in italiano nel settore edilizia/cartongesso.
Riceverai una frase parlata (a volte imprecisa) e devi estrarre UNA O PIÙ righe di ordine.
Per ogni riga, identifica:
- fornitore_riconosciuto: se nella frase è presente uno dei fornitori della lista (tolleranza errori trascrizione), altrimenti null
- categoria_riconosciuta: codice (A, B, C, ...) se la frase contiene il nome di una categoria nota (es. "lastre standard"→A, "isolanti"→I); gestisci singolare/plurale; altrimenti null
- termini_ricerca: array di parole/numeri residui utili per cercare nella descrizione (esclusi fornitore e categoria già riconosciuti). Includi spessore, dimensioni, sigle prodotto.
- quantita: numero (gestisci numeri parlati: "cinquanta"→50, "due e mezzo"→2.5)
- unita_misura: "mq", "ml", "pz", "kg", "cad", "sacco", null se non chiara
- spessore: stringa (es. "12,5") o null
- dimensione: stringa (es. "1200x3000") o null
RISPONDI SOLO chiamando lo strumento "extract_righe". Nessun testo extra.`;

const TOOL = {
  name: "extract_righe",
  description: "Estrae le righe di ordine dalla frase",
  input_schema: {
    type: "object",
    properties: {
      righe: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fornitore_riconosciuto: { type: ["string", "null"] },
            categoria_riconosciuta: { type: ["string", "null"] },
            termini_ricerca: { type: "array", items: { type: "string" } },
            quantita: { type: ["number", "null"] },
            unita_misura: { type: ["string", "null"] },
            spessore: { type: ["string", "null"] },
            dimensione: { type: ["string", "null"] },
          },
          required: ["termini_ricerca"],
        },
      },
    },
    required: ["righe"],
  },
};

export const interpretaVoce = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InterpretInput.parse(d))
  .handler(async ({ data }) => {
    const userPrompt = `Fornitori noti: ${data.fornitori.join(", ")}
Categorie note: ${data.categorie.map((c) => `${c.codice}=${c.descrizione}`).join("; ")}

Frase: "${data.testo}"`;

    const resp = await callClaude({
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 1024,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "extract_righe" },
    });

    const args = extractToolUse<{ righe?: RigaEstratta[] }>(resp, "extract_righe");
    if (!args) throw new Error("Risposta AI senza tool call");
    return { righe: Array.isArray(args.righe) ? args.righe : [], raw_testo: data.testo };
  });

export type RigaEstratta = {
  fornitore_riconosciuto: string | null;
  categoria_riconosciuta: string | null;
  termini_ricerca: string[];
  quantita: number | null;
  unita_misura: string | null;
  spessore: string | null;
  dimensione: string | null;
};
