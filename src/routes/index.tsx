import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Package, Users, AlertCircle, Send, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Sistema MADE" },
      { name: "description", content: "Dashboard del preventivatore Sistema MADE." },
    ],
  }),
  component: DashboardPage,
});

interface DashStats {
  prevBozza: number;
  prevInviati: number;
  prevConfermati: number;
  valoreMese: number;
  articoliAttivi: number;
  articoliPotenziali: number;
  ultimiPreventivi: Array<{
    id: string;
    numero: string | null;
    data: string;
    stato: string;
    totale: number | null;
    cliente: string | null;
  }>;
}

async function fetchDashboardStats(): Promise<DashStats> {
  const now = new Date();
  const inizioMese = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [
    { count: prevBozza },
    { count: prevInviati },
    { count: prevConfermati },
    { count: articoliAttivi },
    { count: articoliPotenziali },
    { data: prevMese },
    { data: ultimi },
  ] = await Promise.all([
    supabase.from("preventivi").select("id", { count: "exact", head: true }).eq("stato", "bozza"),
    supabase.from("preventivi").select("id", { count: "exact", head: true }).eq("stato", "inviato"),
    supabase.from("preventivi").select("id", { count: "exact", head: true }).eq("stato", "confermato"),
    supabase.from("articoli").select("id", { count: "exact", head: true }).eq("stato", "attivo"),
    supabase.from("articoli").select("id", { count: "exact", head: true }).eq("stato", "potenziale"),
    supabase.from("preventivi").select("totale, data").gte("data", inizioMese),
    supabase
      .from("preventivi")
      .select("id, numero, data, stato, totale, clienti(ragione_sociale)")
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const valoreMese = (prevMese ?? []).reduce((s, p: any) => s + Number(p.totale ?? 0), 0);

  return {
    prevBozza: prevBozza ?? 0,
    prevInviati: prevInviati ?? 0,
    prevConfermati: prevConfermati ?? 0,
    valoreMese,
    articoliAttivi: articoliAttivi ?? 0,
    articoliPotenziali: articoliPotenziali ?? 0,
    ultimiPreventivi: (ultimi ?? []).map((p: any) => ({
      id: p.id,
      numero: p.numero,
      data: p.data,
      stato: p.stato,
      totale: p.totale,
      cliente: p.clienti?.ragione_sociale ?? null,
    })),
  };
}

function formatEur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
  });

  const today = mounted
    ? new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  return (
    <AppShell>
      <div className="p-3 md:p-4 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-wrap gap-2 items-baseline justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Dashboard Sistema MADE
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Panoramica preventivi, articoli e attività recenti.
            </p>
          </div>
          <div className="font-mono text-xs text-muted-foreground" suppressHydrationWarning>
            {today}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <StatCard label="Bozze" value={data?.prevBozza} icon={FileText} />
          <StatCard label="Inviati" value={data?.prevInviati} icon={Send} />
          <StatCard label="Confermati" value={data?.prevConfermati} icon={CheckCircle2} />
          <StatCard
            label="Valore offerte mese"
            value={data ? formatEur(data.valoreMese) : undefined}
            icon={FileText}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <StatCard label="Articoli attivi" value={data?.articoliAttivi} icon={Package} />
          <StatCard
            label="Articoli potenziali"
            value={data?.articoliPotenziali}
            icon={AlertCircle}
            highlight={(data?.articoliPotenziali ?? 0) > 0}
            footer={
              (data?.articoliPotenziali ?? 0) > 0 ? (
                <Link to="/articoli" className="text-xs text-primary underline mt-2 inline-block">
                  Esporta per GAMMA →
                </Link>
              ) : null
            }
          />
        </div>

        <div className="mt-8 bg-card border border-border rounded-md">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Ultimi preventivi</h2>
            <Link to="/preventivi" className="text-xs text-primary hover:underline">
              Vedi tutti →
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-5 py-2">Numero</th>
                <th className="text-left font-medium px-5 py-2">Cliente</th>
                <th className="text-left font-medium px-5 py-2">Data</th>
                <th className="text-left font-medium px-5 py-2">Stato</th>
                <th className="text-right font-medium px-5 py-2">Totale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                    Caricamento…
                  </td>
                </tr>
              )}
              {!isLoading && (data?.ultimiPreventivi.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                    Nessun preventivo recente.
                  </td>
                </tr>
              )}
              {data?.ultimiPreventivi.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-5 py-2 font-mono">
                    <Link to="/preventivi/$id" params={{ id: p.id }} className="hover:underline">
                      {p.numero ?? "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-2 text-foreground">{p.cliente ?? "—"}</td>
                  <td className="px-5 py-2 font-mono text-muted-foreground">
                    {new Date(p.data).toLocaleDateString("it-IT")}
                  </td>
                  <td className="px-5 py-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-foreground">
                      {p.stato}
                    </span>
                  </td>
                  <td className="px-5 py-2 font-mono text-right">
                    {p.totale != null ? formatEur(Number(p.totale)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
  footer,
}: {
  label: string;
  value: number | string | undefined;
  icon: typeof FileText;
  highlight?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={`bg-card border rounded-md p-4 flex items-start justify-between ${
        highlight ? "border-primary/40" : "border-border"
      }`}
    >
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-mono text-2xl font-semibold text-foreground mt-2">
          {value ?? "—"}
        </div>
        {footer}
      </div>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}
