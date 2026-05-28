import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Placeholder } from "@/components/layout/Placeholder";

export const Route = createFileRoute("/clienti")({
  head: () => ({ meta: [{ title: "Clienti — Sistema MADE" }] }),
  component: () => (
    <AppShell>
      <Placeholder title="Clienti" code="MOD-005" />
    </AppShell>
  ),
});
