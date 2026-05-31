// Server-only helper per chiamare l'API Anthropic (Claude).
// La chiave ANTHROPIC_API_KEY è letta da process.env solo dentro le server function
// (mai esposta al client). Non loggare mai la chiave.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-6";

export type ClaudeMessage = {
  role: "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "tool_use"; id: string; name: string; input: unknown }
        | { type: "tool_result"; tool_use_id: string; content: string }
      >;
};

export type ClaudeTool = {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
};

export type ClaudeOptions = {
  system?: string;
  messages: ClaudeMessage[];
  max_tokens?: number;
  model?: string;
  tools?: ClaudeTool[];
  tool_choice?: { type: "tool"; name: string } | { type: "auto" } | { type: "any" };
  temperature?: number;
};

export type ClaudeResponse = {
  content: Array<
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: unknown }
  >;
  stop_reason: string;
};

export async function callClaude(opts: ClaudeOptions): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY non configurata nei secrets.");
  }

  const body: Record<string, unknown> = {
    model: opts.model ?? DEFAULT_CLAUDE_MODEL,
    max_tokens: opts.max_tokens ?? 1024,
    messages: opts.messages,
  };
  if (opts.system) body.system = opts.system;
  if (opts.tools) body.tools = opts.tools;
  if (opts.tool_choice) body.tool_choice = opts.tool_choice;
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;

  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const status = resp.status;
    let detail = "";
    try {
      const j = await resp.json();
      detail = j?.error?.message ?? "";
    } catch {
      detail = await resp.text().catch(() => "");
    }
    // Log senza chiave
    console.error("Anthropic API error", status, detail?.slice(0, 500));
    if (status === 401) throw new Error("Chiave Anthropic non valida.");
    if (status === 429) throw new Error("Limite di richieste Anthropic raggiunto, riprova tra poco.");
    if (status === 402 || /credit|balance/i.test(detail))
      throw new Error("Credito Anthropic esaurito.");
    if (status >= 500) throw new Error("Servizio Anthropic momentaneamente non disponibile.");
    throw new Error(`Errore Anthropic (${status}): ${detail || "richiesta rifiutata"}`);
  }

  return (await resp.json()) as ClaudeResponse;
}

/** Estrae il testo concatenato dai blocchi "text" della risposta. */
export function extractText(resp: ClaudeResponse): string {
  return resp.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Estrae il primo blocco tool_use con il nome dato. */
export function extractToolUse<T = unknown>(
  resp: ClaudeResponse,
  toolName: string,
): T | null {
  const block = resp.content.find(
    (b): b is { type: "tool_use"; id: string; name: string; input: unknown } =>
      b.type === "tool_use" && b.name === toolName,
  );
  return block ? (block.input as T) : null;
}
