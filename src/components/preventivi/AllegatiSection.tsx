import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Paperclip, Upload, Download, Trash2, FileText, FileImage, File as FileIcon, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  CATEGORIE, CATEGORIE_LABEL, type Allegato, type CategoriaAllegato,
  deleteAllegato, fetchAllegati, formatBytes, getSignedUrl, uploadAllegato,
} from "@/lib/allegati-api";

function iconFor(mime: string | null) {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return FileImage;
  if (mime === "application/pdf" || mime.includes("word") || mime.includes("text")) return FileText;
  return FileIcon;
}

export function AllegatiSection({ preventivoId }: { preventivoId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

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
    try {
      const url = await getSignedUrl(a.storage_path, 120);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Paperclip className="h-4 w-4" /> Allegati ({allegati.length})
          </h2>
          <UploadDialog preventivoId={preventivoId} open={open} onOpenChange={setOpen} onDone={invalidate} />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : allegati.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun allegato. Carica il primo file.</p>
        ) : (
          <div className="space-y-4">
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
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{a.nome_file}</div>
                          <div className="text-xs text-muted-foreground">{formatBytes(a.dimensione_bytes)}</div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => handleDownload(a)} title="Scarica">
                          <Download className="h-4 w-4" />
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
      </CardContent>
    </Card>
  );
}

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
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-1 h-4 w-4" /> Carica allegato
        </Button>
      </DialogTrigger>
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
