import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin);
}

export function InviaEmailDialog({
  open,
  onOpenChange,
  blob,
  fileName,
  mimeType,
  defaultTo,
  defaultSubject,
  defaultBody,
  preventivoId,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  blob: Blob | null;
  fileName: string;
  mimeType?: string;
  defaultTo?: string | null;
  defaultSubject?: string;
  defaultBody?: string;
  preventivoId?: string;
  title?: string;
  description?: string;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(defaultTo ?? "");
      setSubject(defaultSubject ?? "");
      setBody(defaultBody ?? "");
    }
  }, [open, defaultTo, defaultSubject, defaultBody]);

  const canSend = useMemo(
    () => !sending && !!blob && isValidEmail(to) && subject.trim().length > 0,
    [sending, blob, to, subject],
  );

  async function handleSend() {
    if (!blob) {
      toast.error("PDF non disponibile");
      return;
    }
    if (!isValidEmail(to)) {
      toast.error("Email destinatario non valida");
      return;
    }
    if (!subject.trim()) {
      toast.error("Oggetto obbligatorio");
      return;
    }
    setSending(true);
    try {
      const pdf_base64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("invia-email-preventivo", {
        body: {
          preventivo_id: preventivoId,
          destinatario: to.trim(),
          oggetto: subject.trim(),
          corpo: body,
          pdf_base64,
          nome_file: fileName,
          mime_type: mimeType ?? blob.type ?? "application/pdf",
        },
      });
      if (error) throw error;
      if (data && (data as { ok?: boolean }).ok === false) {
        throw new Error((data as { error?: string }).error ?? "Invio fallito");
      }
      toast.success("Email inviata");
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Errore invio: " + (e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !sending && onOpenChange(v)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title ?? "Invia preventivo per email"}</DialogTitle>
          <DialogDescription>
            {description ?? <>Il PDF <span className="font-mono">{fileName}</span> sarà allegato al messaggio.</>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Destinatario *</Label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="cliente@esempio.it"
              disabled={sending}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Oggetto *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Messaggio</Label>
            <Textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Annulla
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {sending ? (
              <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Invio…</>
            ) : (
              <><Send className="mr-1 h-4 w-4" /> Invia</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
