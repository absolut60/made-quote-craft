import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Placeholder } from "@/components/layout/Placeholder";

export const Route = createFileRoute("/listini")({
  head: () => ({ meta: [{ title: "Listini — Sistema MADE" }] }),
  component: () => (
    <AppShell>
      <Placeholder title="Listini" code="MOD-003" />
    </AppShell>
  ),
});
