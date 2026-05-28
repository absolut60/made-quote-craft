import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchArticoli, type Articolo } from "@/lib/articoli-api";
import { cn } from "@/lib/utils";

export function ArticoloPicker({
  value,
  onChange,
  placeholder = "Seleziona articolo…",
}: {
  value: string | null;
  onChange: (articoloId: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["articoli-picker", q],
    queryFn: () => fetchArticoli({ search: q, stato: "attivo" }, 50),
  });

  const { data: selected } = useQuery({
    queryKey: ["articolo-picker-selected", value],
    queryFn: async () => {
      if (!value) return null;
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("articoli")
        .select("id, cod_gamma, descrizione, um")
        .eq("id", value)
        .maybeSingle();
      return data;
    },
    enabled: !!value,
  });

  const label = useMemo(() => {
    if (!selected) return null;
    return `${selected.cod_gamma ?? "—"} · ${selected.descrizione}`;
  }, [selected]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="h-7 w-full justify-between px-2 font-mono text-xs"
        >
          <span className="truncate">{label ?? placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <div className="flex items-center gap-2 border-b px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per codice o descrizione…"
            className="h-7 border-0 px-0 text-xs focus-visible:ring-0"
          />
        </div>
        <div className="max-h-72 overflow-auto">
          {items.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">Nessun risultato</div>
          ) : (
            items.map((a: Articolo) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  onChange(a.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-2 border-b px-2 py-1.5 text-left text-xs hover:bg-accent",
                  value === a.id && "bg-accent/50",
                )}
              >
                <Check
                  className={cn("mt-0.5 h-3 w-3", value === a.id ? "opacity-100" : "opacity-0")}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-mono">{a.cod_gamma ?? "—"}</div>
                  <div className="truncate text-muted-foreground">{a.descrizione}</div>
                </div>
                <span className="font-mono text-muted-foreground">{a.um ?? ""}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
