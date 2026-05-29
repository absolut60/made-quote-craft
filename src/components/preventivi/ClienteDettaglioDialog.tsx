import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { fetchCantieri, fetchCliente } from "@/lib/clienti-api";

export function ClienteDettaglioDialog({
  clienteId,
  open,
  onOpenChange,
}: {
  clienteId: string | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const { data: cliente, isLoading } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: () => (clienteId ? fetchCliente(clienteId) : null),
    enabled: !!clienteId && open,
  });
  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri", clienteId],
    queryFn: () => (clienteId ? fetchCantieri(clienteId) : []),
    enabled: !!clienteId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-navy">
            {cliente?.ragione_sociale ?? "Dettaglio cliente"}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !cliente ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Caricamento…</div>
        ) : (
          <div className="space-y-5 text-sm">
            <section className="rounded-md border bg-card p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy">
                Anagrafica
              </h3>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 md:grid-cols-2">
                <Info label="ID cliente" value={cliente.id_cliente} mono />
                <Info label="P.IVA" value={cliente.piva} mono />
                <Info label="Indirizzo" value={cliente.indirizzo} />
                <Info
                  label="Comune"
                  value={
                    cliente.comune
                      ? `${cliente.comune.nome}${cliente.comune.provincia ? ` (${cliente.comune.provincia})` : ""}`
                      : null
                  }
                />
                <Info label="CAP" value={cliente.cap} mono />
                <Info label="Prov" value={cliente.prov} mono />
                <Info label="Filiale" value={cliente.filiale} />
                <Info label="Agente" value={cliente.agente?.nome} />
                <Info
                  label="Fascia listino"
                  value={
                    cliente.fascia_listino_default ? (
                      <Badge variant="secondary">{cliente.fascia_listino_default}</Badge>
                    ) : null
                  }
                />
              </div>
            </section>

            <section className="rounded-md border bg-card p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy">
                Cantieri ({cantieri.length})
              </h3>
              {cantieri.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nessun cantiere collegato.</p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5">Nome</th>
                        <th className="px-2 py-1.5">Indirizzo</th>
                        <th className="px-2 py-1.5">Comune</th>
                        <th className="px-2 py-1.5">Prov</th>
                        <th className="px-2 py-1.5">CAP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cantieri.map((c) => (
                        <tr key={c.id} className="border-b">
                          <td className="px-2 py-1.5 font-medium">{c.nome}</td>
                          <td className="px-2 py-1.5">{c.indirizzo ?? "—"}</td>
                          <td className="px-2 py-1.5">{c.comune?.nome ?? "—"}</td>
                          <td className="px-2 py-1.5 font-mono">
                            {c.prov ?? c.comune?.provincia ?? "—"}
                          </td>
                          <td className="px-2 py-1.5 font-mono">{c.cap ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        <DialogFooter>
          {clienteId && (
            <Button asChild variant="outline" size="sm">
              <Link to="/clienti/$id" params={{ id: clienteId }} onClick={() => onOpenChange(false)}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Apri scheda completa
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-sm text-foreground" : "text-sm text-foreground"}>
        {value || value === 0 ? value : "—"}
      </span>
    </div>
  );
}
