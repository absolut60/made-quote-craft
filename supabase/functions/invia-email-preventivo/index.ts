// Edge Function: invia-email-preventivo
// Invia il PDF di un preventivo via SMTP (SSL) con corpo HTML + footer aziendale MADE.
// Il logo "sistema MADE" è allegato inline (Content-ID "logo-made") nel riquadro navy.

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { LOGO_NAVY_JPEG_B64 } from "./logo.ts";


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
  const clean = b64.replace(/^data:[^;]+;base64,/, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(messaggioUtente: string): string {
  const msgHtml = escapeHtml(messaggioUtente).replace(/\n/g, "<br/>");
  const privacy =
    "In ottemperanza al regolamento UE 2016/679 (RGPD) si precisa che la presente comunicazione contiene " +
    "informazioni riservate e confidenziali ed è destinata esclusivamente ai destinatari della medesima qui " +
    "indicati. Le opinioni, le conclusioni e le altre informazioni sul contenuto, che non siano relative alla " +
    "nostra attività caratteristica, devono essere considerate come non inviate né avvalorate da noi. Tutte le " +
    "informazioni contenute sono soggette ai termini e alle condizioni previste dagli accordi che regolano il " +
    "rapporto con il cliente. Nel caso in cui abbiate ricevuto per errore la presente comunicazione, vogliate " +
    "cortesemente darcene immediata notizia, e poi procedere alla cancellazione di questo messaggio dal Vostro " +
    "sistema. È strettamente proibito e potrebbe essere fonte di violazione di legge qualsiasi uso, " +
    "comunicazione, copia o diffusione dei contenuti di questa comunicazione da parte di chi la abbia ricevuta " +
    "per errore o in violazione degli scopi della presente.";

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#333333;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
    <tr><td align="left" style="padding:24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">
        <tr><td style="font-size:14px;line-height:1.5;color:#333333;padding-bottom:24px;">
          ${msgHtml}
        </td></tr>

        <tr><td style="border-top:1px solid #d9d9d9;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>

        <tr><td style="padding-top:18px;font-size:13px;line-height:1.6;color:#333333;">
          <div style="font-weight:bold;color:#0d1f3c;font-size:14px;">Made Distribuzione – Sede di Cinisello Balsamo</div>
          <div>Tel: <a href="tel:+390225569828" style="color:#0d1f3c;text-decoration:none;">02 25569828</a></div>
          <div><a href="https://www.gruppomade.com" style="color:#0d1f3c;text-decoration:underline;">www.gruppomade.com</a></div>
        </td></tr>

        <tr><td style="padding:16px 0;">
          <img src="data:image/jpeg;base64,${LOGO_NAVY_JPEG_B64}" width="280" alt="sistema MADE" style="display:block;width:280px;max-width:280px;height:auto;border:0;outline:none;text-decoration:none;"/>
        </td></tr>

        <tr><td style="padding-top:8px;font-size:10px;line-height:1.4;color:#888888;text-align:justify;">
          ${privacy}
        </td></tr>

        <tr><td style="padding-top:12px;font-size:11px;line-height:1.4;color:#2e7d32;">
          ♻️ Per favore, prima di stampare questa email considera l'impatto sull'ambiente.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPlainText(messaggioUtente: string): string {
  return (
    messaggioUtente +
    "\n\n--\n" +
    "Made Distribuzione – Sede di Cinisello Balsamo\n" +
    "Tel: 02 25569828\n" +
    "www.gruppomade.com\n\n" +
    "Per favore, prima di stampare questa email considera l'impatto sull'ambiente."
  );
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
    const htmlBody = buildHtml(corpo ?? "");
    const textBody = buildPlainText(corpo ?? "");

    try {
      await client.send({
        from: SMTP_FROM,
        to: destinatario,
        subject: oggetto,
        content: textBody,
        html: htmlBody,
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
