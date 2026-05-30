import { supabase } from "@/integrations/supabase/client";

export const BUCKET_ARTICOLO = "allegati-articoli";

export const CATEGORIE_ARTICOLO = [
  "scheda_tecnica",
  "scheda_sicurezza",
  "certificazione_ce_dop",
  "certificazione_antincendio",
  "certificazione_acustica",
  "dichiarazione_conformita",
  "voce_capitolato",
  "manuale_posa",
  "certificato_ambientale",
  "immagine_prodotto",
  "disegno_tecnico",
  "altro",
] as const;

export type CategoriaAllegatoArticolo = (typeof CATEGORIE_ARTICOLO)[number];

export const CATEGORIE_ARTICOLO_LABEL: Record<CategoriaAllegatoArticolo, string> = {
  scheda_tecnica: "Scheda tecnica",
  scheda_sicurezza: "Scheda di sicurezza (SDS)",
  certificazione_ce_dop: "Certificazione CE / DoP",
  certificazione_antincendio: "Certificazione antincendio / REI",
  certificazione_acustica: "Certificazione acustica",
  dichiarazione_conformita: "Marcatura / Dichiarazione di conformità",
  voce_capitolato: "Voce di capitolato",
  manuale_posa: "Manuale di posa / Istruzioni",
  certificato_ambientale: "Certificato ambientale (EPD/LEED)",
  immagine_prodotto: "Immagine / Foto prodotto",
  disegno_tecnico: "Disegno tecnico / CAD",
  altro: "Altro",
};

export type AllegatoArticolo = {
  id: string;
  articolo_id: string;
  categoria: CategoriaAllegatoArticolo;
  nome_file: string;
  storage_path: string;
  mime_type: string | null;
  dimensione_bytes: number | null;
  created_at: string;
};

export async function fetchAllegatiArticolo(articoloId: string): Promise<AllegatoArticolo[]> {
  const { data, error } = await supabase
    .from("allegati_articolo")
    .select("*")
    .eq("articolo_id", articoloId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AllegatoArticolo[];
}

export async function uploadAllegatoArticolo(args: {
  articoloId: string;
  file: File;
  categoria: CategoriaAllegatoArticolo;
}): Promise<AllegatoArticolo> {
  const { articoloId, file, categoria } = args;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${articoloId}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET_ARTICOLO)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("allegati_articolo")
    .insert({
      articolo_id: articoloId,
      categoria,
      nome_file: file.name,
      storage_path: path,
      mime_type: file.type || null,
      dimensione_bytes: file.size,
    })
    .select("*")
    .single();
  if (error) {
    await supabase.storage.from(BUCKET_ARTICOLO).remove([path]);
    throw error;
  }
  return data as AllegatoArticolo;
}

export async function deleteAllegatoArticolo(a: AllegatoArticolo): Promise<void> {
  await supabase.storage.from(BUCKET_ARTICOLO).remove([a.storage_path]);
  const { error } = await supabase
    .from("allegati_articolo")
    .delete()
    .eq("id", a.id);
  if (error) throw error;
}

export async function getSignedUrlArticolo(storagePath: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_ARTICOLO)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
