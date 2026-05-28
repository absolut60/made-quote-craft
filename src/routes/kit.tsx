import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Placeholder } from "@/components/layout/Placeholder";

export const Route = createFileRoute("/kit")({
  head: () => ({ meta: [{ title: "Kit / Lavorazioni — Sistema MADE" }] }),
  component: () => (
    <AppShell>
      <Placeholder title="Kit / Lavorazioni" code="MOD-004" />
    </AppShell>
  ),
});
