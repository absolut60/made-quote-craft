import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Mail, Printer, X } from "lucide-react";
import { toast } from "sonner";
type PdfJs = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfJs> | null = null;
function loadPdfJs(): Promise<PdfJs> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const lib = await import("pdfjs-dist");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      lib.GlobalWorkerOptions.workerSrc = workerUrl;
      return lib;
    })();
  }
  return pdfjsPromise;
}

export function AnteprimaPdfDialog({
  open, onOpenChange, blob, fileName, onInviaEmail,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  blob: Blob | null;
  fileName: string;
  onInviaEmail?: () => void;
}) {
  const pdfBlob = useMemo(
    () => (blob ? (blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" })) : null),
    [blob],
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);

  // URL solo per stampa/esporta (non per rendering)
  const blobUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (open && pdfBlob) {
      const u = URL.createObjectURL(pdfBlob);
      blobUrlRef.current = u;
    }
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [open, pdfBlob]);

  // Render PDF su canvas via pdf.js
  useEffect(() => {
    if (!open || !pdfBlob) return;
    let cancelled = false;
    let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;

    async function renderAll() {
      setLoading(true);
      setError(null);
      setNumPages(0);
      const container = canvasContainerRef.current;
      if (container) container.innerHTML = "";

      try {
        const arrayBuffer = await pdfBlob!.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        pdfDoc = await loadingTask.promise;
        if (cancelled) return;
        setNumPages(pdfDoc.numPages);

        const containerWidth = (scrollRef.current?.clientWidth ?? 760) - 24;
        const dpr = window.devicePixelRatio || 1;

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          if (cancelled) return;
          const page = await pdfDoc.getPage(i);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = "mx-auto mb-3 shadow-sm bg-white";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          if (dpr !== 1) ctx.scale(dpr, dpr);

          if (canvasContainerRef.current) {
            canvasContainerRef.current.appendChild(canvas);
          }

          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          page.cleanup();
          if (i === 1) setLoading(false);
        }
        setLoading(false);
      } catch (e) {
        console.error("PDF render error", e);
        if (!cancelled) {
          setError("Impossibile generare l'anteprima del PDF.");
          setLoading(false);
        }
      }
    }

    renderAll();
    return () => {
      cancelled = true;
      if (pdfDoc) pdfDoc.destroy().catch(() => {});
      if (canvasContainerRef.current) canvasContainerRef.current.innerHTML = "";
    };
  }, [open, pdfBlob]);

  function handleStampa() {
    const url = blobUrlRef.current;
    if (!url) return;
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
    const url = blobUrlRef.current;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[95vh] max-h-[95vh] w-[95vw] max-w-3xl flex-col gap-3 p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Anteprima documento</DialogTitle>
          <div className="text-xs text-muted-foreground">
            {fileName}{numPages > 0 ? ` · ${numPages} pagina${numPages > 1 ? "e" : ""}` : ""}
          </div>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="relative min-h-0 flex-1 overflow-auto rounded border bg-muted/30 p-3"
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Caricamento anteprima…
              </div>
            </div>
          )}
          {error && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm">
              <p className="text-destructive">{error}</p>
              <Button size="sm" variant="outline" onClick={handleEsporta}>
                <Download className="mr-1 h-4 w-4" /> Scarica PDF
              </Button>
            </div>
          )}
          <div ref={canvasContainerRef} />
        </div>

        <DialogFooter className="shrink-0 flex flex-wrap gap-2 sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="mr-1 h-4 w-4" /> Chiudi
          </Button>
          <Button variant="outline" onClick={handleEmail} title="Disponibile a breve">
            <Mail className="mr-1 h-4 w-4" /> Invia per email
          </Button>
          <Button variant="outline" onClick={handleStampa} disabled={!pdfBlob}>
            <Printer className="mr-1 h-4 w-4" /> Stampa
          </Button>
          <Button onClick={handleEsporta} disabled={!pdfBlob}>
            <Download className="mr-1 h-4 w-4" /> Esporta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
