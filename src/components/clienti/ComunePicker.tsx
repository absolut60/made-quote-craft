import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { searchComuni, fetchComune } from "@/lib/clienti-api";
import { cn } from "@/lib/utils";

export function ComunePicker({
  value,
  onChange,
  placeholder = "Seleziona comune…",
}: {
  value: string | null;
  onChange: (id: string | null, provincia: string | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debQ, setDebQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data: current } = useQuery({
    queryKey: ["comune", value],
    queryFn: () => (value ? fetchComune(value) : Promise.resolve(null)),
    enabled: !!value,
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["comuni-search", debQ],
    queryFn: () => searchComuni(debQ, 40),
    enabled: open,
  });

  const label = current ? `${current.nome}${current.provincia ? ` (${current.provincia})` : ""}` : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="h-9 w-full justify-between font-normal"
        >
          <span className={cn("truncate", !label && "text-muted-foreground")}>
            {label || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null, null);
                }}
              />
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="relative border-b">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca comune…"
            className="h-9 border-0 pl-8 focus-visible:ring-0"
          />
        </div>
        <div className="max-h-72 overflow-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Caricamento…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {debQ ? "Nessun comune trovato" : "Inizia a digitare…"}
            </div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id, c.provincia ?? null);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-muted"
              >
                <span>
                  {c.nome}
                  {c.provincia ? <span className="ml-2 text-muted-foreground">({c.provincia})</span> : null}
                  {c.cap ? <span className="ml-2 font-mono text-muted-foreground">{c.cap}</span> : null}
                </span>
                {value === c.id && <Check className="h-3.5 w-3.5" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
