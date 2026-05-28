import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Cella numerica editabile in stile foglio di calcolo.
 * Commit on blur o Enter; rollback su Escape.
 */
export function EditableNumberCell({
  value,
  onCommit,
  className,
  step = 0.01,
  disabled,
  placeholder,
  suffix,
}: {
  value: number | null | undefined;
  onCommit: (v: number | null) => void | Promise<void>;
  className?: string;
  step?: number;
  disabled?: boolean;
  placeholder?: string;
  suffix?: string;
}) {
  const [local, setLocal] = useState<string>(value == null ? "" : String(value));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) setLocal(value == null ? "" : String(value));
  }, [value, editing]);

  async function commit() {
    setEditing(false);
    const trimmed = local.trim().replace(",", ".");
    if (trimmed === "" && (value == null || Number.isNaN(value as number))) return;
    const num = trimmed === "" ? null : Number(trimmed);
    if (num !== null && !Number.isFinite(num)) {
      setLocal(value == null ? "" : String(value));
      return;
    }
    if (num === value) return;
    try {
      setBusy(true);
      await onCommit(num);
    } finally {
      setBusy(false);
    }
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      value={local}
      placeholder={placeholder ?? "—"}
      disabled={disabled || busy}
      onChange={(e) => {
        setEditing(true);
        setLocal(e.target.value);
      }}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setLocal(value == null ? "" : String(value));
          setEditing(false);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className={cn(
        "w-full bg-transparent px-1.5 py-1 text-right font-mono text-xs outline-none",
        "rounded border border-transparent hover:border-input focus:border-ring focus:bg-card",
        busy && "opacity-50",
        suffix && "pr-4",
        className,
      )}
    />
  );
}
