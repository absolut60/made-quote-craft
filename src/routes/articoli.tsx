import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Placeholder } from "@/components/layout/Placeholder";

export const Route = createFileRoute("/articoli")({
  head: () => ({ meta: [{ title: "Articoli — Sistema MADE" }] }),
  component: () => (
    <AppShell>
      <Placeholder title="Articoli" code="MOD-002" />
    </AppShell>
  ),
});
