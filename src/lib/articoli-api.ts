import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Articolo = Database["public"]["Tables"]["articoli"]["Row"];
export type ArticoloInsert = Database["public"]["Tables"]["articoli"]["Insert"];
export type ArticoloUpdate = Database["public"]["Tables"]["articoli"]["Update"];
export type StatoArticolo = Database["public"]["Enums"]["stato_articolo"];
export type FasciaListino = Database["public"]["Enums"]["fascia_listino"];
export type ListinoAcquisto = Database["public"]["Tables"]["listini_acquisto"]["Row"];
export type ListinoAcquistoInsert = Database["public"]["Tables"]["listini_acquisto"]["Insert"];
export type ListinoVendita = Database["public"]["Tables"]["listini_vendita"]["Row"];
export type ListinoVenditaInsert = Database["public"]["Tables"]["listini_vendita"]["Insert"];
export type Fornitore = Database["public"]["Tables"]["fornitori"]["Row"];

export const FASCE: FasciaListino[] = ["A", "B", "C", "S", "SOCI"];

export interface ArticoliFilters {
  search?: string;
  categoria?: string | null;
  tipologia?: string | null;
  fornitore_id?: string | null;
  stato?: StatoArticolo | null;
}

export async function fetchArticoli(filters: ArticoliFilters, limit = 500) {
  let q = supabase
    .from("articoli")
    .select("*, fornitore:fornitori(id, ragione_sociale)")
    .order("cod_gamma", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim().replace(/[%,]/g, " ");
    q = q.or(`cod_gamma.ilike.%${s}%,descrizione.ilike.%${s}%,cod_fornitore.ilike.%${s}%`);
  }
  if (filters.categoria) q = q.eq("categoria", filters.categoria);
  if (filters.tipologia) q = q.eq("tipologia", filters.tipologia);
  if (filters.fornitore_id) q = q.eq("fornitore_id", filters.fornitore_id);
  if (filters.stato) q = q.eq("stato", filters.stato);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchArticolo(id: string) {
  const { data, error } = await supabase
    .from("articoli")
    .select("*, fornitore:fornitori(id, ragione_sociale)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchFornitori(): Promise<Fornitore[]> {
  const { data, error } = await supabase
    .from("fornitori")
    .select("*")
    .order("ragione_sociale");
  if (error) throw error;
  return data ?? [];
}

export async function fetchArticoliFacets() {
  const { data, error } = await supabase
    .from("articoli")
    .select("categoria, tipologia")
    .limit(5000);
  if (error) throw error;
  const categorie = new Set<string>();
  const tipologie = new Set<string>();
  for (const r of data ?? []) {
    if (r.categoria) categorie.add(r.categoria);
    if (r.tipologia) tipologie.add(r.tipologia);
  }
  return {
    categorie: [...categorie].sort(),
    tipologie: [...tipologie].sort(),
  };
}

export async function updateArticolo(id: string, patch: ArticoloUpdate) {
  const { data, error } = await supabase
    .from("articoli")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchListiniAcquisto(articolo_id: string): Promise<ListinoAcquisto[]> {
  const { data, error } = await supabase
    .from("listini_acquisto")
    .select("*")
    .eq("articolo_id", articolo_id)
    .order("data_validita", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertListinoAcquisto(row: ListinoAcquistoInsert) {
  const { data, error } = await supabase
    .from("listini_acquisto")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteListinoAcquisto(id: string) {
  const { error } = await supabase.from("listini_acquisto").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchListiniVendita(articolo_id: string): Promise<ListinoVendita[]> {
  const { data, error } = await supabase
    .from("listini_vendita")
    .select("*")
    .eq("articolo_id", articolo_id);
  if (error) throw error;
  return data ?? [];
}

export async function upsertListinoVendita(row: ListinoVenditaInsert) {
  const { data, error } = await supabase
    .from("listini_vendita")
    .upsert(row, { onConflict: "articolo_id,fascia" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Catena costo:
 *   costo → sconti SC1..SC5 in cascata → costo_parziale
 *   costo_parziale + trasporto_eur, poi maggiorazione trasporto_perc → costo_netto
 */
export function calcCostoNetto(l: Partial<ListinoAcquisto>) {
  const costo = Number(l.costo ?? 0);
  if (!costo) return { costo_parziale: 0, costo_netto: 0 };
  const scs = [l.sc1, l.sc2, l.sc3, l.sc4, l.sc5].map((v) => Number(v ?? 0));
  let parziale = costo;
  for (const sc of scs) parziale = parziale * (1 - sc / 100);
  const trasportoEur = Number(l.trasporto_eur ?? 0);
  const trasportoPerc = Number(l.trasporto_perc ?? 0);
  const netto = (parziale + trasportoEur) * (1 + trasportoPerc / 100);
  return { costo_parziale: round2(parziale), costo_netto: round2(netto) };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function prezzoFromRicarico(costoNetto: number, ricarico: number) {
  return round2(costoNetto * (1 + ricarico / 100));
}
export function ricaricoFromPrezzo(costoNetto: number, prezzo: number) {
  if (!costoNetto) return 0;
  return round2(((prezzo - costoNetto) / costoNetto) * 100);
}
export function margineFromPrezzo(costoNetto: number, prezzo: number) {
  if (!prezzo) return 0;
  return round2(((prezzo - costoNetto) / prezzo) * 100);
}
