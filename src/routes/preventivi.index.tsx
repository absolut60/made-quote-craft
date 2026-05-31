import { createFileRoute } from "@tanstack/react-router";
import { PreventiviListView } from "@/components/preventivi/PreventiviListView";

export const Route = createFileRoute("/preventivi/")({
  head: () => ({ meta: [{ title: "Preventivi — Sistema MADE" }] }),
  component: () => <PreventiviListView tipo="preventivo" />,
});
