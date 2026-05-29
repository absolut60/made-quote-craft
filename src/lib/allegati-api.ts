import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "allegati-preventivi";

export const CATEGORIE = [
  "capitolato",
  "disegni",
  "scheda_tecnica",
  "certificazioni",
  "foto_cantiere",
  "documenti_commerciali",
  "altro",
] as const;

export type CategoriaAllegato = (typeof CATEGORIE)[number];

export const CATEGORIE_LABEL: Record<CategoriaAllegato, string> = {
  capitolato: "Capitolato",
  disegni: "Disegni / Planimetrie",
  scheda_tecnica: "Scheda tecnica prodotto",
  certificazioni: "Certificazioni",
  foto_cantiere: "Foto cantiere",
  documenti_commerciali: "Documenti commerciali",
  altro: "Altro",
};

export type Allegato = {
  id: string;
  preventivo_id: string;
  categoria: CategoriaAllegato;
  nome_file: string;
  storage_path: string;
  mime_type: string | null;
  dimensione_bytes: number | null;
  created_at: string;
};

export async function fetchAllegati(preventivoId: string): Promise<Allegato[]> {
  const { data, error } = await supabase
    .from("allegati_preventivo")
    .select("*")
    .eq("preventivo_id", preventivoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Allegato[];
}

export async function uploadAllegato(args: {
  preventivoId: string;
  file: File;
  categoria: CategoriaAllegato;
}): Promise<Allegato> {
  const { preventivoId, file, categoria } = args;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${preventivoId}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("allegati_preventivo")
    .insert({
      preventivo_id: preventivoId,
      categoria,
      nome_file: file.name,
      storage_path: path,
      mime_type: file.type || null,
      dimensione_bytes: file.size,
    })
    .select("*")
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data as Allegato;
}

export async function deleteAllegato(a: Allegato): Promise<void> {
  await supabase.storage.from(BUCKET).remove([a.storage_path]);
  const { error } = await supabase
    .from("allegati_preventivo")
    .delete()
    .eq("id", a.id);
  if (error) throw error;
}

export async function getSignedUrl(storagePath: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
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
