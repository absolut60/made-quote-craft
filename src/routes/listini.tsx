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
        <div className="border-b bg-card px-3 pt-3 lg:px-6 lg:pt-4">
          <h1 className="text-lg font-bold text-navy lg:text-xl">Listini</h1>
          <p className="hidden text-xs text-muted-foreground lg:block">
            Vista trasversale: editing inline come foglio di calcolo. Le formule sono centralizzate
            in <code className="font-mono">src/lib/pricing.ts</code>.
          </p>
          <Tabs defaultValue="acquisto" className="mt-2 lg:mt-3">
            <TabsList>
              <TabsTrigger value="acquisto">Acquisto</TabsTrigger>
              <TabsTrigger value="vendita">Vendita</TabsTrigger>
            </TabsList>
            <TabsContent
              value="acquisto"
              className="mt-0 -mx-3 border-t data-[state=inactive]:hidden lg:-mx-6"
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
