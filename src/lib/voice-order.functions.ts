import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
RISPONDI SOLO chiamando la function "extract_righe". Nessun testo extra.`;

export const interpretaVoce = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InterpretInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY non configurata");

    const userPrompt = `Fornitori noti: ${data.fornitori.join(", ")}
Categorie note: ${data.categorie.map((c) => `${c.codice}=${c.descrizione}`).join("; ")}

Frase: "${data.testo}"`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_righe",
            description: "Estrae le righe di ordine dalla frase",
            parameters: {
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
                    additionalProperties: false,
                  },
                },
              },
              required: ["righe"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_righe" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    const json = await resp.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("Risposta AI senza tool call");
    let args: { righe?: RigaEstratta[] } = {};
    try {
      args = JSON.parse(call.function?.arguments ?? "{}");
    } catch {
      throw new Error("JSON AI non valido");
    }
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

