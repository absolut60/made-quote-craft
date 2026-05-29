import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Mail, Printer, X } from "lucide-react";
import { toast } from "sonner";

export function AnteprimaPdfDialog({
  open, onOpenChange, blob, fileName, onInviaEmail,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  blob: Blob | null;
  fileName: string;
  onInviaEmail?: () => void;
}) {
  const [iframeError, setIframeError] = useState(false);

  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  useEffect(() => {
    if (!open) setIframeError(false);
  }, [open]);

  function handleStampa() {
    if (!url) return;
    const iframe = document.getElementById("anteprima-pdf-iframe") as HTMLIFrameElement | null;
    try {
      if (iframe?.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      }
    } catch {
      // fallback below
    }
    const w = window.open(url, "_blank");
    if (w) {
      w.addEventListener("load", () => {
        try { w.print(); } catch { /* ignore */ }
      });
    } else {
      toast.error("Il browser ha bloccato la stampa. Consenti i popup e riprova.");
    }
  }

  function handleEsporta() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleEmail() {
    if (onInviaEmail) onInviaEmail();
    else toast.info("Invio email in arrivo prossimamente");
  }

  function handleOpenNewTab() {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Anteprima documento</DialogTitle>
          <div className="text-xs text-muted-foreground">{fileName}</div>
        </DialogHeader>

        <div className="w-full overflow-hidden rounded border bg-muted/30" style={{ height: "70vh" }}>
          {url && !iframeError ? (
            <iframe
              id="anteprima-pdf-iframe"
              src={url}
              title="Anteprima PDF"
              className="h-full w-full"
              onError={() => setIframeError(true)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm">
              <p className="text-muted-foreground">
                L'anteprima inline non è disponibile su questo dispositivo.
              </p>
              <Button size="sm" variant="outline" onClick={handleOpenNewTab}>
                Apri in nuova scheda
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="mr-1 h-4 w-4" /> Chiudi
          </Button>
          <Button variant="outline" onClick={handleEmail} title="Disponibile a breve">
            <Mail className="mr-1 h-4 w-4" /> Invia per email
          </Button>
          <Button variant="outline" onClick={handleStampa} disabled={!url}>
            <Printer className="mr-1 h-4 w-4" /> Stampa
          </Button>
          <Button onClick={handleEsporta} disabled={!url}>
            <Download className="mr-1 h-4 w-4" /> Esporta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
