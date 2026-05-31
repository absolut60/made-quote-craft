import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { ArticoloConListini } from "@/lib/kit-api";
import { cn } from "@/lib/utils";

const ARTICOLO_SELECT = `
  id, cod_gamma, cod_fornitore, descrizione, um, peso_unit, qta_fornitore, qta_cliente,
  listini_acquisto:listini_acquisto(*),
  listini_vendita:listini_vendita(*)
`;

export type QuickArticoloSearchHandle = {
  focus: () => void;
};

export const QuickArticoloSearch = forwardRef<
  QuickArticoloSearchHandle,
  {
    onPick: (a: ArticoloConListini) => void | Promise<void>;
    placeholder?: string;
  }
>(function QuickArticoloSearch(
  { onPick, placeholder = "Cerca articolo per codice o descrizione… (Invio per inserire)" },
  ref,
) {
  const [q, setQ] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      try {
        inputRef.current?.focus();
      } catch {
        /* noop */
      }
    },
  }));

  const { data: items = [] } = useQuery({
    queryKey: ["articoli-quick", q],
    queryFn: async () => {
      let qb = supabase
        .from("articoli")
        .select(ARTICOLO_SELECT)
        .eq("stato", "attivo")
        .order("cod_gamma", { ascending: true, nullsFirst: false })
        .limit(15);
      const s = q.trim().replace(/[%,]/g, " ");
      if (s) {
        qb = qb.or(
          `cod_gamma.ilike.%${s}%,descrizione.ilike.%${s}%,cod_fornitore.ilike.%${s}%`,
        );
      }
      const { data, error } = await qb;
      if (error) throw error;
      for (const a of (data ?? []) as unknown as ArticoloConListini[]) {
        a.listini_acquisto?.sort((x, y) => {
          const dx = x.data_validita ?? x.created_at ?? "";
          const dy = y.data_validita ?? y.created_at ?? "";
          return dy.localeCompare(dx);
        });
      }
      return (data ?? []) as unknown as ArticoloConListini[];
    },
    enabled: q.trim().length > 0,
  });

  useEffect(() => {
    setHighlighted(0);
  }, [q, items.length]);

  async function pick(a: ArticoloConListini) {
    if (busy) return;
    setBusy(true);
    try {
      await onPick(a);
      setQ("");
      setHighlighted(0);
      setOpen(false);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        try {
          inputRef.current?.focus();
        } catch {
          /* noop */
        }
      });
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlighted((h) => Math.min(h + 1, Math.max(0, items.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const a = items[highlighted];
      if (a) pick(a);
    } else if (e.key === "Escape") {
      setQ("");
      setOpen(false);
    }
  }

  const show = open && q.trim().length > 0 && items.length > 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded border border-dashed bg-muted/20 px-2 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
          placeholder={placeholder}
          disabled={busy}
          className="h-7 border-0 bg-transparent px-0 text-xs focus-visible:ring-0"
        />
        <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
          ↑↓ · Invio
        </span>
      </div>
      {show && (
        <div className="absolute bottom-full left-0 right-0 z-30 mb-1 max-h-72 overflow-auto rounded border bg-popover shadow-lg">
          {items.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(a);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                "flex w-full items-start gap-2 border-b px-2 py-1.5 text-left text-xs",
                i === highlighted ? "bg-accent" : "hover:bg-accent/50",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="font-mono">{a.cod_gamma ?? "—"}</div>
                <div className="truncate text-muted-foreground">{a.descrizione}</div>
              </div>
              <span className="font-mono text-muted-foreground">{a.um ?? ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
