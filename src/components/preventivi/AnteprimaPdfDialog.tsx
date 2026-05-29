import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Mail, Printer, X } from "lucide-react";
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
  // Garantisce MIME corretto anche se il blob arriva senza type
  const pdfBlob = useMemo(
    () => (blob ? (blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" })) : null),
    [blob],
  );

  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  // Crea l'object URL quando il dialog è aperto; revoca SOLO alla chiusura/unmount
  useEffect(() => {
    if (open && pdfBlob) {
      const u = URL.createObjectURL(pdfBlob);
      urlRef.current = u;
      setUrl(u);
    }
    return () => {
      if (!open && urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
        setUrl(null);
      }
    };
  }, [open, pdfBlob]);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  function handleStampa() {
    if (!url) return;
    const iframe = document.getElementById("anteprima-pdf-iframe") as HTMLIFrameElement | null;
    try {
      if (iframe?.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      }
    } catch { /* fallback below */ }
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
      <DialogContent className="flex h-[95vh] max-h-[95vh] w-[95vw] max-w-3xl flex-col gap-3 p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Anteprima documento</DialogTitle>
          <div className="text-xs text-muted-foreground">{fileName}</div>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded border bg-muted/30">
          {url ? (
            <object
              data={url}
              type="application/pdf"
              className="h-full w-full"
              aria-label="Anteprima PDF"
            >
              <iframe
                id="anteprima-pdf-iframe"
                src={url}
                title="Anteprima PDF"
                className="h-full w-full"
              />
              <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm">
                <p className="text-muted-foreground">
                  L'anteprima inline non è disponibile su questo dispositivo.
                </p>
                <Button size="sm" variant="outline" onClick={handleOpenNewTab}>
                  <ExternalLink className="mr-1 h-4 w-4" /> Apri in nuova scheda
                </Button>
              </div>
            </object>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Generazione anteprima…
            </div>
          )}
        </div>

        {/* Fallback sempre visibile per browser che bloccano il rendering inline */}
        <div className="shrink-0 text-center text-xs text-muted-foreground">
          Se non vedi l'anteprima,{" "}
          <button
            type="button"
            onClick={handleOpenNewTab}
            disabled={!url}
            className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
          >
            apri il PDF in una nuova scheda
          </button>
          .
        </div>

        <DialogFooter className="shrink-0 flex flex-wrap gap-2 sm:justify-end">
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
