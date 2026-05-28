import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, FileBarChart, Package, Truck, Download, FileSpreadsheet } from "lucide-react";
import type { PreventivoConDettagli } from "@/lib/preventivi-api";
import {
  exportPreventivoPdf, exportPropostaRapidaPdf, exportListaMaterialiPdf, exportListaFornitorePdf,
} from "@/lib/pdf-export";
import { exportListaMaterialiXlsx, exportListaFornitoreXlsx } from "@/lib/excel-export";

type Modalita = "PREVENTIVO" | "PROPOSTA_RAPIDA" | "LISTA_MATERIALI" | "LISTA_FORNITORE";

const MODI: { id: Modalita; label: string; desc: string; icon: typeof FileText; excel: boolean }[] = [
  {
    id: "PREVENTIVO", label: "Preventivo",
    desc: "PDF ufficiale per il cliente: intestazione MADE, dati cantiere, blocchi con materiali, totali e IVA.",
    icon: FileText, excel: false,
  },
  {
    id: "PROPOSTA_RAPIDA", label: "Proposta rapida",
    desc: "Versione sintetica: solo Rif., descrizione, prezzo/mq e importo per ogni blocco.",
    icon: FileBarChart, excel: false,
  },
  {
    id: "LISTA_MATERIALI", label: "Lista materiali",
    desc: "Elenco materiali con quantità teoriche totali (somma incidenze × quantità) raggruppato per articolo.",
    icon: Package, excel: true,
  },
  {
    id: "LISTA_FORNITORE", label: "Lista mat. fornitore",
    desc: "Conferma d'ordine: quantità arrotondate ai minimi di vendita (confezioni/bancali interi), raggruppate per fornitore.",
    icon: Truck, excel: true,
  },
];

export function GeneraDocumentoDialog({
  open, onOpenChange, prev,
}: { open: boolean; onOpenChange: (v: boolean) => void; prev: PreventivoConDettagli }) {
  const [sel, setSel] = useState<Modalita>("PREVENTIVO");
  const [busy, setBusy] = useState(false);

  async function run(formato: "pdf" | "xlsx") {
    setBusy(true);
    try {
      if (formato === "pdf") {
        if (sel === "PREVENTIVO") await exportPreventivoPdf(prev);
        else if (sel === "PROPOSTA_RAPIDA") await exportPropostaRapidaPdf(prev);
        else if (sel === "LISTA_MATERIALI") await exportListaMaterialiPdf(prev);
        else await exportListaFornitorePdf(prev);
      } else {
        if (sel === "LISTA_MATERIALI") await exportListaMaterialiXlsx(prev);
        else if (sel === "LISTA_FORNITORE") await exportListaFornitoreXlsx(prev);
      }
      toast.success("Documento generato");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const modoCorrente = MODI.find((m) => m.id === sel)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Genera documento</DialogTitle>
          <DialogDescription>Scegli la modalità di output dal preventivo {prev.numero ?? ""}.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {MODI.map((m) => {
            const Icon = m.icon;
            const active = sel === m.id;
            return (
              <Card
                key={m.id}
                onClick={() => setSel(m.id)}
                className={`cursor-pointer border-2 p-3 transition ${
                  active ? "border-primary bg-primary/5" : "border-transparent hover:border-muted"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-6 w-6 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <div className="text-sm font-semibold">{m.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{m.desc}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Annulla</Button>
          {modoCorrente.excel && (
            <Button variant="outline" onClick={() => run("xlsx")} disabled={busy}>
              <FileSpreadsheet className="mr-1 h-4 w-4" /> Esporta Excel
            </Button>
          )}
          <Button onClick={() => run("pdf")} disabled={busy}>
            <Download className="mr-1 h-4 w-4" /> {busy ? "Generazione…" : "Genera PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
