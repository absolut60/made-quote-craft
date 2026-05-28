import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Placeholder } from "@/components/layout/Placeholder";

export const Route = createFileRoute("/utenti")({
  head: () => ({ meta: [{ title: "Utenti — Sistema MADE" }] }),
  component: () => (
    <AppShell>
      <Placeholder title="Utenti" code="MOD-006" />
    </AppShell>
  ),
});
