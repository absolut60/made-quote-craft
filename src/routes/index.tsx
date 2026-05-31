import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Package, AlertCircle, Send, CheckCircle2, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Sistema MADE" },
      { name: "description", content: "Dashboard del preventivatore Sistema MADE." },
    ],
  }),
  component: DashboardPage,
});

interface DocRecente {
  id: string;
  numero: string | null;
  data: string;
  stato: string;
  totale: number | null;
  cliente: string | null;
}

interface DashStats {
  // Preventivi
  prevBozza: number;
  prevInviati: number;
  prevConfermati: number;
  valoreOfferteMese: number;
  ultimiPreventivi: DocRecente[];
  // Ordini
  ordBozza: number;
  ordConfermati: number;
  valoreOrdinatoMese: number;
  ultimiOrdini: DocRecente[];
  // Articoli
  articoliAttivi: number;
  articoliPotenziali: number;
}

async function fetchDashboardStats(): Promise<DashStats> {
  const now = new Date();
  const inizioMese = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const baseCount = (tipo: "preventivo" | "ordine", stato: string) =>
    supabase
      .from("preventivi")
      .select("id", { count: "exact", head: true })
      .eq("tipo", tipo)
      .eq("stato", stato);

  const [
    { count: prevBozza },
    { count: prevInviati },
    { count: prevConfermati },
    { count: ordBozza },
    { count: ordConfermati },
    { count: articoliAttivi },
    { count: articoliPotenziali },
    { data: prevMese },
    { data: ordMese },
    { data: ultimiPrev },
    { data: ultimiOrd },
  ] = await Promise.all([
    baseCount("preventivo", "bozza"),
    baseCount("preventivo", "inviato"),
    baseCount("preventivo", "confermato"),
    baseCount("ordine", "bozza"),
    baseCount("ordine", "confermato"),
    supabase.from("articoli").select("id", { count: "exact", head: true }).eq("stato", "attivo"),
    supabase.from("articoli").select("id", { count: "exact", head: true }).eq("stato", "potenziale"),
    supabase.from("preventivi").select("totale, data").eq("tipo", "preventivo").gte("data", inizioMese),
    supabase.from("preventivi").select("totale, data").eq("tipo", "ordine").gte("data", inizioMese),
    supabase
      .from("preventivi")
      .select("id, numero, data, stato, totale, clienti(ragione_sociale)")
      .eq("tipo", "preventivo")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("preventivi")
      .select("id, numero, data, stato, totale, clienti(ragione_sociale)")
      .eq("tipo", "ordine")
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const sumTotale = (rows: any[] | null) =>
    (rows ?? []).reduce((s, p: any) => s + Number(p.totale ?? 0), 0);

  const mapDoc = (rows: any[] | null): DocRecente[] =>
    (rows ?? []).map((p: any) => ({
      id: p.id,
      numero: p.numero,
      data: p.data,
      stato: p.stato,
      totale: p.totale,
      cliente: p.clienti?.ragione_sociale ?? null,
    }));

  return {
    prevBozza: prevBozza ?? 0,
    prevInviati: prevInviati ?? 0,
    prevConfermati: prevConfermati ?? 0,
    valoreOfferteMese: sumTotale(prevMese),
    ultimiPreventivi: mapDoc(ultimiPrev),
    ordBozza: ordBozza ?? 0,
    ordConfermati: ordConfermati ?? 0,
    valoreOrdinatoMese: sumTotale(ordMese),
    ultimiOrdini: mapDoc(ultimiOrd),
    articoliAttivi: articoliAttivi ?? 0,
    articoliPotenziali: articoliPotenziali ?? 0,
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
              Panoramica preventivi, ordini, articoli e attività recenti.
            </p>
          </div>
          <div className="font-mono text-xs text-muted-foreground" suppressHydrationWarning>
            {today}
          </div>
        </div>

        {/* ARTICOLI (comune) */}
        <SectionTitle>Articoli</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
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

        {/* PREVENTIVI */}
        <SectionTitle>Preventivi</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
          <StatCard label="Bozze" value={data?.prevBozza} icon={FileText} />
          <StatCard label="Inviati" value={data?.prevInviati} icon={Send} />
          <StatCard label="Confermati" value={data?.prevConfermati} icon={CheckCircle2} />
          <StatCard
            label="Valore offerte mese"
            value={data ? formatEur(data.valoreOfferteMese) : undefined}
            icon={FileText}
          />
        </div>
        <RecentDocsTable
          title="Ultimi preventivi"
          linkLabel="Vedi tutti →"
          linkTo="/preventivi"
          docLinkTo="/preventivi/$id"
          rows={data?.ultimiPreventivi}
          isLoading={isLoading}
          emptyLabel="Nessun preventivo recente."
        />

        {/* ORDINI */}
        <SectionTitle>Ordini</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
          <StatCard label="Bozze" value={data?.ordBozza} icon={ShoppingCart} />
          <StatCard label="Confermati" value={data?.ordConfermati} icon={CheckCircle2} />
          <StatCard
            label="Valore ordinato mese"
            value={data ? formatEur(data.valoreOrdinatoMese) : undefined}
            icon={ShoppingCart}
          />
        </div>
        <RecentDocsTable
          title="Ultimi ordini"
          linkLabel="Vedi tutti →"
          linkTo="/ordini"
          docLinkTo="/preventivi/$id"
          rows={data?.ultimiOrdini}
          isLoading={isLoading}
          emptyLabel="Nessun ordine recente."
        />
      </div>
    </AppShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-foreground mt-8 pb-2 border-b border-border">
      {children}
    </h2>
  );
}

function RecentDocsTable({
  title,
  linkLabel,
  linkTo,
  docLinkTo,
  rows,
  isLoading,
  emptyLabel,
}: {
  title: string;
  linkLabel: string;
  linkTo: string;
  docLinkTo: "/preventivi/$id";
  rows: DocRecente[] | undefined;
  isLoading: boolean;
  emptyLabel: string;
}) {
  return (
    <div className="mt-4 bg-card border border-border rounded-md">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Link to={linkTo as any} className="text-xs text-primary hover:underline">
          {linkLabel}
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
          {!isLoading && (rows?.length ?? 0) === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                {emptyLabel}
              </td>
            </tr>
          )}
          {rows?.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30">
              <td className="px-5 py-2 font-mono">
                <Link to={docLinkTo} params={{ id: p.id }} className="hover:underline">
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
