import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ListinoAcquistoView } from "@/components/listini/ListinoAcquistoView";
import { ListinoVenditaView } from "@/components/listini/ListinoVenditaView";

export const Route = createFileRoute("/listini")({
  head: () => ({ meta: [{ title: "Listini — Sistema MADE" }] }),
  component: ListiniPage,
});

function ListiniPage() {
  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <div className="border-b bg-card px-6 pt-4">
          <h1 className="text-xl font-bold text-navy">Listini</h1>
          <p className="text-xs text-muted-foreground">
            Vista trasversale: editing inline come foglio di calcolo. Le formule sono centralizzate
            in <code className="font-mono">src/lib/pricing.ts</code>.
          </p>
          <Tabs defaultValue="acquisto" className="mt-3">
            <TabsList>
              <TabsTrigger value="acquisto">Listino acquisto</TabsTrigger>
              <TabsTrigger value="vendita">Listino vendita</TabsTrigger>
            </TabsList>
            <TabsContent
              value="acquisto"
              className="mt-0 -mx-6 border-t data-[state=inactive]:hidden"
              forceMount
            >
              <ListinoAcquistoView />
            </TabsContent>
            <TabsContent
              value="vendita"
              className="mt-0 -mx-6 border-t data-[state=inactive]:hidden"
              forceMount
            >
              <ListinoVenditaView />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}
