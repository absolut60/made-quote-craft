import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Send, Loader2, Sparkles, Bot, User as UserIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { chiediAssistente } from "@/lib/product-assistant.functions";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { MicButton } from "@/components/voice/MicButton";

export const Route = createFileRoute("/assistente-prodotti")({
  component: AssistentePage,
  head: () => ({ meta: [{ title: "Assistente prodotti (beta) — Sistema MADE" }] }),
});

type Fonte = {
  id: string;
  cod_gamma: string | null;
  descrizione: string;
  fornitore: string | null;
  categoria: string | null;
};

type Criteri = {
  fornitore: string | null;
  categoria: string | null;
  termini: string[];
  spessore_min: number | null;
  spessore_max: number | null;
};

type Messaggio = {
  role: "user" | "assistant";
  content: string;
  fonti?: Fonte[];
  criteri?: Criteri;
  totale_trovati?: number;
};

const ESEMPI = [
  "Quali lastre ignifughe Knauf ho sopra i 12mm con prezzo fascia A?",
  "Che differenza c'è tra categoria A e B?",
  "Quali isolanti di Rockwool ho e a che prezzo?",
  "Qual è il montante più economico da 50?",
];

function AssistentePage() {
  const chiedi = useServerFn(chiediAssistente);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechRecognition({
    onFinal: (text) => setInput((prev) => (prev ? prev + " " : "") + text),
  });

  const invia = async (testo?: string) => {
    const domanda = (testo ?? input).trim();
    if (!domanda || loading) return;
    if (speech.listening) speech.stop();
    setInput("");
    const userMsg: Messaggio = { role: "user", content: domanda };
    const nuovo = [...messaggi, userMsg];
    setMessaggi(nuovo);
    setLoading(true);
    try {
      const storico = messaggi.map((m) => ({ role: m.role, content: m.content }));
      const r = await chiedi({ data: { domanda, storico } });
      setMessaggi([
        ...nuovo,
        {
          role: "assistant",
          content: r.risposta,
          fonti: r.fonti,
          criteri: r.criteri,
          totale_trovati: r.totale_trovati,
        },
      ]);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-4xl flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Assistente prodotti</h1>
          <Badge variant="secondary" className="ml-1">beta</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Chiedi informazioni sui prodotti del tuo catalogo. Le risposte sono basate sui dati reali
          (articoli, listini, categorie).
        </p>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-md border bg-muted/20 p-4"
        >
          {messaggi.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Prova un esempio:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {ESEMPI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => invia(e)}
                    className="rounded-md border bg-background p-3 text-left text-sm hover:bg-accent"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messaggi.map((m, i) => (
            <div key={i} className="flex gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {m.role === "user" ? (
                  <div className="rounded-md bg-background p-3 text-sm">{m.content}</div>
                ) : (
                  <Card className="p-3 text-sm">
                    {m.criteri && (
                      <div className="mb-2 flex flex-wrap gap-1.5 border-b pb-2 text-xs">
                        {m.criteri.fornitore && (
                          <Badge variant="outline">For: {m.criteri.fornitore}</Badge>
                        )}
                        {m.criteri.categoria && (
                          <Badge variant="outline">Cat: {m.criteri.categoria}</Badge>
                        )}
                        {m.criteri.termini.map((t) => (
                          <Badge key={t} variant="secondary">{t}</Badge>
                        ))}
                        {m.criteri.spessore_min != null && (
                          <Badge variant="outline">≥ {m.criteri.spessore_min}mm</Badge>
                        )}
                        {m.criteri.spessore_max != null && (
                          <Badge variant="outline">≤ {m.criteri.spessore_max}mm</Badge>
                        )}
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    {m.fonti && m.fonti.length > 0 && (
                      <details className="mt-3 rounded-md border bg-muted/30 p-2 text-xs">
                        <summary className="cursor-pointer font-medium">
                          Fonti ({m.fonti.length}
                          {m.totale_trovati && m.totale_trovati > m.fonti.length
                            ? ` di ${m.totale_trovati} totali`
                            : ""}
                          )
                        </summary>
                        <ul className="mt-2 space-y-1">
                          {m.fonti.map((f) => (
                            <li key={f.id} className="flex items-start gap-2">
                              <Link
                                to="/articoli/$id"
                                params={{ id: f.id }}
                                className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                              >
                                {f.cod_gamma ?? "—"}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                              <span className="text-muted-foreground">
                                {f.descrizione}
                                {f.fornitore ? ` · ${f.fornitore}` : ""}
                                {f.categoria ? ` · cat ${f.categoria}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </Card>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sto cercando nel catalogo e preparando la risposta…
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Fai una domanda sui tuoi prodotti…"
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                invia();
              }
            }}
            disabled={loading}
          />
          <Button onClick={() => invia()} disabled={loading || !input.trim()} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
