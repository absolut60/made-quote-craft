import { supabase } from "@/integrations/supabase/client";

export const BUCKET_KIT = "allegati-kit";

export const CATEGORIE_KIT = [
  "scheda_tecnica",
  "manuale_posa",
  "disegno_tecnico",
  "voce_capitolato",
  "certificazione",
  "immagine",
  "altro",
] as const;

export type CategoriaAllegatoKit = (typeof CATEGORIE_KIT)[number];

export const CATEGORIE_KIT_LABEL: Record<CategoriaAllegatoKit, string> = {
  scheda_tecnica: "Scheda tecnica",
  manuale_posa: "Manuale di posa / Istruzioni",
  disegno_tecnico: "Disegno tecnico / CAD",
  voce_capitolato: "Voce di capitolato",
  certificazione: "Certificazione",
  immagine: "Immagine / Foto",
  altro: "Altro",
};

export type AllegatoKit = {
  id: string;
  kit_id: string;
  categoria: CategoriaAllegatoKit;
  nome_file: string;
  storage_path: string;
  mime_type: string | null;
  dimensione_bytes: number | null;
  created_at: string;
};

export async function fetchAllegatiKit(kitId: string): Promise<AllegatoKit[]> {
  const { data, error } = await supabase
    .from("allegati_kit" as never)
    .select("*")
    .eq("kit_id", kitId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AllegatoKit[];
}

export async function uploadAllegatoKit(args: {
  kitId: string;
  file: File;
  categoria: CategoriaAllegatoKit;
}): Promise<AllegatoKit> {
  const { kitId, file, categoria } = args;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${kitId}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET_KIT)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("allegati_kit" as never)
    .insert({
      kit_id: kitId,
      categoria,
      nome_file: file.name,
      storage_path: path,
      mime_type: file.type || null,
      dimensione_bytes: file.size,
    } as never)
    .select("*")
    .single();
  if (error) {
    await supabase.storage.from(BUCKET_KIT).remove([path]);
    throw error;
  }
  return data as unknown as AllegatoKit;
}

export async function deleteAllegatoKit(a: AllegatoKit): Promise<void> {
  await supabase.storage.from(BUCKET_KIT).remove([a.storage_path]);
  const { error } = await supabase
    .from("allegati_kit" as never)
    .delete()
    .eq("id", a.id);
  if (error) throw error;
}

export async function getSignedUrlKit(storagePath: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_KIT)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
