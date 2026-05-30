import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "@tanstack/react-router";
import { ClientePicker } from "./ClientePicker";
import { CantierePicker } from "./CantierePicker";
import {
  createPreventivo, fetchAgenti, fetchCliente, anteprimaProssimoNumero,
  TIPI_DOC, TIPI_DOC_LABEL,
  type TipoDoc,
} from "@/lib/preventivi-api";
import { FASCE, type FasciaListino } from "@/lib/articoli-api";
import { toast } from "sonner";

export function NuovoPreventivoDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [cantiereId, setCantiereId] = useState<string | null>(null);
  const [agenteId, setAgenteId] = useState<string | null>(null);
  const [filiale, setFiliale] = useState("");
  const [fascia, setFascia] = useState<FasciaListino>("A");
  const [tipoDoc, setTipoDoc] = useState<TipoDoc>("PREVENTIVO");
  const [numero, setNumero] = useState("");
  const [data, setData] = useState(today);
  const [validita, setValidita] = useState("");

  const { data: agenti = [] } = useQuery({ queryKey: ["agenti"], queryFn: fetchAgenti });

  // Quando cambia il cliente: precompila fascia, agente, filiale
  useEffect(() => {
    if (!clienteId) return;
    fetchCliente(clienteId).then((c) => {
      if (!c) return;
      if (c.fascia_listino_default) setFascia(c.fascia_listino_default);
      if (c.agente_id) setAgenteId(c.agente_id);
      if (c.filiale) setFiliale(c.filiale);
      setCantiereId(null);
    });
  }, [clienteId]);

  const create = useMutation({
    mutationFn: async () => {
      let numeroFinal = numero.trim();
      if (!numeroFinal) {
        const anno = new Date().getFullYear();
        const { data: prog, error } = await supabase.rpc("prossimo_numero_preventivo", { p_anno: anno });
        if (error) throw error;
        numeroFinal = `PRV-${prog}/${String(anno).slice(-2)}`;
      }
      const dataFinal = data || today;
      const fasciaFinal: FasciaListino = fascia || "A";
      const tipoDocFinal: TipoDoc = tipoDoc || "PREVENTIVO";
      return createPreventivo({
        cliente_id: clienteId,
        cantiere_id: cantiereId,
        agente_id: agenteId,
        filiale: filiale || null,
        fascia_listino: fasciaFinal,
        tipo_doc: tipoDocFinal,
        numero: numeroFinal,
        data: dataFinal,
        validita: validita || null,
      });
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      toast.success("Preventivo creato");
      onOpenChange(false);
      navigate({ to: "/preventivi/$id", params: { id: p.id } });
    },
    onError: (e: unknown) => {
      console.error("[NuovoPreventivoDialog] create error:", e);
      toast.error((e as Error).message || "Errore creazione preventivo");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nuovo preventivo</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Cliente *</Label>
            <ClientePicker value={clienteId} onChange={setClienteId} />
          </div>
          <div className="grid gap-1.5">
            <Label>Cantiere</Label>
            <CantierePicker cliente_id={clienteId} value={cantiereId} onChange={setCantiereId} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Agente</Label>
              <Select value={agenteId ?? ""} onValueChange={(v) => setAgenteId(v || null)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {agenti.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Filiale</Label>
              <Input value={filiale} onChange={(e) => setFiliale(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Fascia listino</Label>
              <Select value={fascia} onValueChange={(v) => setFascia(v as FasciaListino)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FASCE.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo documento</Label>
              <Select value={tipoDoc} onValueChange={(v) => setTipoDoc(v as TipoDoc)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPI_DOC.map((t) => (
                    <SelectItem key={t} value={t}>{TIPI_DOC_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Numero</Label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="es. 2026/0001" />
            </div>
            <div className="grid gap-1.5">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Validità</Label>
              <Input type="date" value={validita} onChange={(e) => setValidita(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={() => create.mutate()} disabled={!clienteId || create.isPending}>
            Crea preventivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
