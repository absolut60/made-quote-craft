import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { FileText, Package, Users, Wrench } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Sistema MADE" },
      { name: "description", content: "Dashboard del preventivatore Sistema MADE." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Benvenuto nel Preventivatore Sistema MADE
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestionale interno per la preventivazione dei sistemi a secco.
            </p>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {new Date().toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[
            { label: "Preventivi aperti", value: "—", icon: FileText },
            { label: "Articoli a listino", value: "—", icon: Package },
            { label: "Kit / lavorazioni", value: "—", icon: Wrench },
            { label: "Clienti attivi", value: "—", icon: Users },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className="bg-card border border-border rounded-md p-4 flex items-start justify-between"
              >
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </div>
                  <div className="font-mono text-2xl font-semibold text-foreground mt-2">
                    {k.value}
                  </div>
                </div>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-card border border-border rounded-md">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Stato moduli</h2>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
              Fase 0
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-5 py-2">Modulo</th>
                <th className="text-left font-medium px-5 py-2">Codice</th>
                <th className="text-left font-medium px-5 py-2">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Preventivi", "MOD-001", "In sviluppo"],
                ["Articoli", "MOD-002", "In sviluppo"],
                ["Listini", "MOD-003", "In sviluppo"],
                ["Kit / Lavorazioni", "MOD-004", "In sviluppo"],
                ["Clienti", "MOD-005", "In sviluppo"],
                ["Utenti", "MOD-006", "In sviluppo"],
              ].map(([m, c, s]) => (
                <tr key={c}>
                  <td className="px-5 py-2.5 text-foreground">{m}</td>
                  <td className="px-5 py-2.5 font-mono text-muted-foreground">{c}</td>
                  <td className="px-5 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-tri-green" />
                      <span className="text-muted-foreground">{s}</span>
                    </span>
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
