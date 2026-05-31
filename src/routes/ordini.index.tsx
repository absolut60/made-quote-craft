import { createFileRoute } from "@tanstack/react-router";
import { PreventiviListView } from "@/components/preventivi/PreventiviListView";

export const Route = createFileRoute("/ordini/")({
  head: () => ({ meta: [{ title: "Ordini — Sistema MADE" }] }),
  component: () => <PreventiviListView tipo="ordine" />,
});
