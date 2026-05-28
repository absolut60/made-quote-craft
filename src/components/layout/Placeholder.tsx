import { Construction } from "lucide-react";

export function Placeholder({ title, code }: { title: string; code: string }) {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">Modulo in costruzione.</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{code}</span>
      </div>

      <div className="mt-8 bg-card border border-border rounded-md p-12 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center mb-4">
          <Construction className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Sezione "{title}"</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Questo modulo verrà sviluppato nelle prossime fasi del progetto Sistema MADE.
        </p>
        <div className="tricolor-bar h-[3px] w-16 rounded-sm mt-6" />
      </div>
    </div>
  );
}
