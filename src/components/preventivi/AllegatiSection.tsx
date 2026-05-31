import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Paperclip, Upload, Download, Trash2, FileText, FileImage, File as FileIcon,
  Loader2, Eye, Printer, Mail,
} from "lucide-react";
import { toast } from "sonner";
import {
  BUCKET, CATEGORIE, CATEGORIE_LABEL, type Allegato, type CategoriaAllegato,
  deleteAllegato, fetchAllegati, formatBytes, getSignedUrl, uploadAllegato,
} from "@/lib/allegati-api";
import { InviaEmailDialog } from "@/components/preventivi/InviaEmailDialog";

export type AllegatiEmailContext = {
  tipo?: "preventivo" | "ordine";
  numero?: string | null;
  ragSoc?: string | null;
  clienteEmail?: string | null;
};

function iconFor(mime: string | null) {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return FileImage;
  if (mime === "application/pdf" || mime.includes("word") || mime.includes("text")) return FileText;
  return FileIcon;
}

function isImage(mime: string | null) {
  return !!mime && mime.startsWith("image/");
}
function isPdf(mime: string | null) {
  return mime === "application/pdf";
}

async function downloadAllegato(a: Allegato) {
  const { data, error } = await supabase.storage.from(BUCKET).download(a.storage_path);
  if (error) throw error;
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = a.nome_file;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function printAllegato(a: Allegato) {
  const url = await getSignedUrl(a.storage_path, 300);
  if (isImage(a.mime_type)) {
    const w = window.open("", "_blank");
    if (!w) { toast.error("Popup bloccato. Consenti i popup per stampare."); return; }
    w.document.write(`<!doctype html><html><head><title>${a.nome_file}</title>
      <style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh}
      img{max-width:100%;max-height:100vh}</style></head>
      <body><img src="${url}" onload="setTimeout(()=>window.print(),200)"/></body></html>`);
    w.document.close();
    return;
  }
  // PDF / altri: apri e tenta print
  const w = window.open(url, "_blank");
  if (!w) { toast.error("Popup bloccato. Consenti i popup per stampare."); return; }
  w.addEventListener("load", () => { try { w.print(); } catch { /* ignore */ } });
}

// =========================================================================
// Pulsante con badge + dialog contenente la lista allegati
// =========================================================================
export function AllegatiButton({ preventivoId }: { preventivoId: string }) {
  const [open, setOpen] = useState(false);
  const { data: allegati = [] } = useQuery({
    queryKey: ["allegati", preventivoId],
    queryFn: () => fetchAllegati(preventivoId),
  });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Paperclip className="mr-1 h-4 w-4" />
        Allegati
        <Badge variant="secondary" className="ml-1.5 px-1.5 py-0">{allegati.length}</Badge>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Allegati del preventivo</DialogTitle>
          </DialogHeader>
          <AllegatiList preventivoId={preventivoId} />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Retro-compat: vecchio nome — render della sola lista (per usi inline)
export function AllegatiSection({
  preventivoId,
  emailContext,
}: {
  preventivoId: string;
  emailContext?: AllegatiEmailContext;
}) {
  return <AllegatiList preventivoId={preventivoId} emailContext={emailContext} />;
}

// =========================================================================
// Lista allegati raggruppata + upload + azioni
// =========================================================================
function AllegatiList({
  preventivoId,
  emailContext,
}: {
  preventivoId: string;
  emailContext?: AllegatiEmailContext;
}) {
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<Allegato | null>(null);
  const [emailTarget, setEmailTarget] = useState<{ allegato: Allegato; blob: Blob } | null>(null);

  const { data: allegati = [], isLoading } = useQuery({
    queryKey: ["allegati", preventivoId],
    queryFn: () => fetchAllegati(preventivoId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["allegati", preventivoId] });

  const grouped = useMemo(() => {
    const m = new Map<CategoriaAllegato, Allegato[]>();
    for (const a of allegati) {
      const list = m.get(a.categoria) ?? [];
      list.push(a);
      m.set(a.categoria, list);
    }
    return CATEGORIE.filter((c) => m.has(c)).map((c) => ({ cat: c, items: m.get(c)! }));
  }, [allegati]);

  const del = useMutation({
    mutationFn: (a: Allegato) => deleteAllegato(a),
    onSuccess: () => { toast.success("Allegato eliminato"); invalidate(); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  async function handleDownload(a: Allegato) {
    try { await downloadAllegato(a); } catch (e) { toast.error((e as Error).message); }
  }
  async function handlePrint(a: Allegato) {
    try { await printAllegato(a); } catch (e) { toast.error((e as Error).message); }
  }
  async function handleEmail(a: Allegato) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).download(a.storage_path);
      if (error) throw error;
      setEmailTarget({ allegato: a, blob: data });
    } catch (e) {
      toast.error("Impossibile caricare il file: " + (e as Error).message);
    }
  }

  const docCap = emailContext?.tipo === "ordine" ? "Ordine" : "Preventivo";
  const emailSubject = emailTarget
    ? `${docCap}${emailContext?.numero ? ` ${emailContext.numero}` : ""}${emailContext?.ragSoc ? ` - ${emailContext.ragSoc}` : ""} - ${emailTarget.allegato.nome_file} - Sistema MADE`
    : "";
  const emailBody = emailTarget
    ? `Gentile Cliente,\n\nin allegato trovate il documento "${emailTarget.allegato.nome_file}"${emailContext?.numero ? ` relativo a ${docCap.toLowerCase()} ${emailContext.numero}` : ""}.\nRestiamo a disposizione per qualsiasi chiarimento.\n\nCordiali saluti,\nSistema MADE`
    : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {allegati.length} {allegati.length === 1 ? "allegato" : "allegati"}
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="mr-1 h-4 w-4" /> Carica allegato
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : allegati.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun allegato. Carica il primo file.</p>
      ) : (
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {grouped.map(({ cat, items }) => (
            <div key={cat} className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORIE_LABEL[cat]} ({items.length})
              </div>
              <ul className="divide-y rounded border">
                {items.map((a) => {
                  const Icon = iconFor(a.mime_type);
                  return (
                    <li key={a.id} className="flex items-center gap-2 p-2 text-sm">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => setPreview(a)}
                        className="min-w-0 flex-1 text-left hover:underline"
                        title="Apri anteprima"
                      >
                        <div className="truncate font-medium">{a.nome_file}</div>
                        <div className="text-xs text-muted-foreground">{formatBytes(a.dimensione_bytes)}</div>
                      </button>
                      <Button size="icon" variant="ghost" onClick={() => setPreview(a)} title="Anteprima">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDownload(a)} title="Scarica">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handlePrint(a)} title="Stampa" className="hidden sm:inline-flex">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleEmail} title="Invia per email" className="hidden sm:inline-flex">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive" title="Elimina">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminare l'allegato?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{a.nome_file}" verrà eliminato definitivamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(a)}>Elimina</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <UploadDialog
        preventivoId={preventivoId}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onDone={invalidate}
      />

      <PreviewDialog
        allegato={preview}
        onOpenChange={(v) => { if (!v) setPreview(null); }}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onEmail={handleEmail}
      />
    </div>
  );
}

// =========================================================================
// Preview Dialog
// =========================================================================
function PreviewDialog({
  allegato, onOpenChange, onDownload, onPrint, onEmail,
}: {
  allegato: Allegato | null;
  onOpenChange: (v: boolean) => void;
  onDownload: (a: Allegato) => void;
  onPrint: (a: Allegato) => void;
  onEmail: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;
    setUrl(null);
    if (!allegato) return;
    setLoading(true);
    (async () => {
      try {
        // Per evitare problemi CORS con iframe/img, scarichiamo come blob.
        const { data, error } = await supabase.storage.from(BUCKET).download(allegato.storage_path);
        if (error) throw error;
        blobUrl = URL.createObjectURL(data);
        if (!cancelled) setUrl(blobUrl);
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [allegato]);

  const open = allegato !== null;
  const mime = allegato?.mime_type ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate">{allegato?.nome_file ?? "Anteprima"}</DialogTitle>
        </DialogHeader>
        <div className="w-full overflow-hidden rounded border bg-muted/30" style={{ height: "70vh" }}>
          {loading || !url ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isImage(mime) ? (
            <div className="flex h-full items-center justify-center p-2">
              <img src={url} alt={allegato?.nome_file} className="max-h-full max-w-full object-contain" />
            </div>
          ) : isPdf(mime) ? (
            <iframe src={url} title={allegato?.nome_file} className="h-full w-full" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
              <p>Anteprima non disponibile per questo tipo di file.</p>
              {allegato && (
                <Button size="sm" variant="outline" onClick={() => onDownload(allegato)}>
                  <Download className="mr-1 h-4 w-4" /> Scarica
                </Button>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
          <Button variant="outline" onClick={onEmail}>
            <Mail className="mr-1 h-4 w-4" /> Invia
          </Button>
          <Button variant="outline" onClick={() => allegato && onPrint(allegato)} disabled={!allegato}>
            <Printer className="mr-1 h-4 w-4" /> Stampa
          </Button>
          <Button onClick={() => allegato && onDownload(allegato)} disabled={!allegato}>
            <Download className="mr-1 h-4 w-4" /> Scarica
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// Upload Dialog
// =========================================================================
function UploadDialog({
  preventivoId, open, onOpenChange, onDone,
}: {
  preventivoId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState<CategoriaAllegato>("altro");

  const up = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Seleziona un file");
      return uploadAllegato({ preventivoId, file, categoria });
    },
    onSuccess: () => {
      toast.success("Allegato caricato");
      setFile(null);
      setCategoria("altro");
      onOpenChange(false);
      onDone();
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Carica allegato</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">File</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Categoria</Label>
            <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaAllegato)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIE.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORIE_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={up.isPending}>
            Annulla
          </Button>
          <Button onClick={() => up.mutate()} disabled={!file || up.isPending}>
            {up.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            Carica
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
