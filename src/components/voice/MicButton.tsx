import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  listening: boolean;
  supported: boolean;
  onToggle: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Pulsante microfono riusabile per la dettatura.
 * Mostra lo stato (in ascolto/pronto) e gestisce il browser non supportato.
 */
export function MicButton({ listening, supported, onToggle, size = "md", className }: Props) {
  const sizes = {
    sm: "h-9 w-9",
    md: "h-11 w-11",
    lg: "h-14 w-14",
  };
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };
  const title = !supported
    ? "Riconoscimento vocale non supportato — usa Chrome"
    : listening
      ? "Stop dettatura"
      : "Detta domanda";
  return (
    <Button
      type="button"
      variant={listening ? "destructive" : "secondary"}
      onClick={onToggle}
      disabled={!supported}
      title={title}
      aria-label={title}
      className={cn(
        sizes[size],
        "shrink-0 rounded-full p-0",
        listening && "animate-pulse",
        className,
      )}
    >
      {listening ? <MicOff className={iconSizes[size]} /> : <Mic className={iconSizes[size]} />}
    </Button>
  );
}
