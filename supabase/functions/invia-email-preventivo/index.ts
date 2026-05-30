// Edge Function: invia-email-preventivo
// Invia il PDF di un preventivo via SMTP (SSL).
// JWT richiesto (verify_jwt=true): solo utenti autenticati.

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  preventivo_id?: string;
  destinatario: string;
  oggetto: string;
  corpo: string;
  pdf_base64: string;
  nome_file: string;
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function base64ToUint8(b64: string): Uint8Array {
  // strip data URL prefix if present
  const clean = b64.replace(/^data:application\/pdf;base64,/, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as Payload;
    const { destinatario, oggetto, corpo, pdf_base64, nome_file, preventivo_id } = payload;

    if (!destinatario || !isValidEmail(destinatario)) {
      return new Response(JSON.stringify({ ok: false, error: "Destinatario email non valido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!oggetto?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "Oggetto vuoto" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!pdf_base64 || !nome_file) {
      return new Response(JSON.stringify({ ok: false, error: "PDF mancante" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "";
    const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") ?? "465", 10);
    const SMTP_SECURE = (Deno.env.get("SMTP_SECURE") ?? "true").toLowerCase() === "true";
    const SMTP_USER = Deno.env.get("SMTP_USER") ?? "";
    const SMTP_PASS = Deno.env.get("SMTP_PASS") ?? "";
    const SMTP_FROM = Deno.env.get("SMTP_FROM") ?? SMTP_USER;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return new Response(
        JSON.stringify({ ok: false, error: "Configurazione SMTP mancante (host/user/pass)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(
      `[invia-email-preventivo] prev=${preventivo_id ?? "-"} to=${destinatario} subj="${oggetto}" host=${SMTP_HOST}:${SMTP_PORT} tls=${SMTP_SECURE}`,
    );

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: SMTP_SECURE,
        auth: { username: SMTP_USER, password: SMTP_PASS },
      },
    });

    const pdfBytes = base64ToUint8(pdf_base64);

    try {
      await client.send({
        from: SMTP_FROM,
        to: destinatario,
        subject: oggetto,
        content: corpo, // testo plain
        html: corpo.replace(/\n/g, "<br/>"),
        attachments: [
          {
            filename: nome_file,
            content: pdfBytes,
            encoding: "binary",
            contentType: "application/pdf",
          },
        ],
      });
    } finally {
      try {
        await client.close();
      } catch (_) {
        // ignore
      }
    }

    console.log(`[invia-email-preventivo] OK -> ${destinatario}`);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[invia-email-preventivo] ERROR:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
