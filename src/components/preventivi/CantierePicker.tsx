import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { createCantiere, fetchCantieriByCliente } from "@/lib/preventivi-api";
import { toast } from "sonner";

export function CantierePicker({
  cliente_id,
  value,
  onChange,
}: {
  cliente_id: string | null;
  value: string | null;
  onChange: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [cap, setCap] = useState("");
  const [prov, setProv] = useState("");

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri", cliente_id],
    queryFn: () => (cliente_id ? fetchCantieriByCliente(cliente_id) : Promise.resolve([])),
    enabled: !!cliente_id,
  });

  const create = useMutation({
    mutationFn: () =>
      createCantiere({
        cliente_id: cliente_id!,
        nome: nome.trim(),
        indirizzo: indirizzo || null,
        cap: cap || null,
        prov: prov || null,
      }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["cantieri", cliente_id] });
      onChange(c.id);
      setOpen(false);
      setNome(""); setIndirizzo(""); setCap(""); setProv("");
      toast.success("Cantiere creato");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const items = useMemo(() => cantieri, [cantieri]);

  return (
    <div className="flex gap-2">
      <Select value={value ?? undefined} onValueChange={onChange} disabled={!cliente_id}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={cliente_id ? "Seleziona cantiere…" : "Prima un cliente"} />
        </SelectTrigger>
        <SelectContent>
          {items.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}{c.prov ? ` · ${c.prov}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" disabled={!cliente_id} title="Nuovo cantiere">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo cantiere</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Indirizzo</Label>
              <Input value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>CAP</Label>
                <Input value={cap} onChange={(e) => setCap(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Prov.</Label>
                <Input value={prov} onChange={(e) => setProv(e.target.value)} maxLength={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={() => create.mutate()} disabled={!nome.trim() || create.isPending}>
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
