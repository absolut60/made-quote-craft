import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Placeholder } from "@/components/layout/Placeholder";

export const Route = createFileRoute("/preventivi")({
  head: () => ({ meta: [{ title: "Preventivi — Sistema MADE" }] }),
  component: () => (
    <AppShell>
      <Placeholder title="Preventivi" code="MOD-001" />
    </AppShell>
  ),
});
