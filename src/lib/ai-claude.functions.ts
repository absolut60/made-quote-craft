import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClaude, extractText, DEFAULT_CLAUDE_MODEL } from "./ai-claude.server";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(20000),
});

const Input = z.object({
  system: z.string().max(20000).optional(),
  messages: z.array(MessageSchema).min(1).max(40),
  max_tokens: z.number().int().min(1).max(4096).optional(),
  model: z.string().min(1).max(100).optional(),
});

/**
 * Server function generica "ai-claude": proxy autenticato verso Anthropic.
 * - Protetta da requireSupabaseAuth (solo utenti loggati).
 * - La chiave ANTHROPIC_API_KEY non lascia mai il server.
 * - Restituisce il testo della risposta concatenato.
 */
export const aiClaude = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const resp = await callClaude({
      system: data.system,
      messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: data.max_tokens ?? 1024,
      model: data.model ?? DEFAULT_CLAUDE_MODEL,
    });
    return { testo: extractText(resp), stop_reason: resp.stop_reason };
  });
