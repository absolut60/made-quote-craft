import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Cliente = Database["public"]["Tables"]["clienti"]["Row"];
export type ClienteInsert = Database["public"]["Tables"]["clienti"]["Insert"];
export type ClienteUpdate = Database["public"]["Tables"]["clienti"]["Update"];
export type Cantiere = Database["public"]["Tables"]["cantieri"]["Row"];
export type CantiereInsert = Database["public"]["Tables"]["cantieri"]["Insert"];
export type CantiereUpdate = Database["public"]["Tables"]["cantieri"]["Update"];
export type Agente = Database["public"]["Tables"]["agenti"]["Row"];
export type Comune = Database["public"]["Tables"]["comuni"]["Row"];
export type FasciaListino = Database["public"]["Enums"]["fascia_listino"];

export const FASCE: FasciaListino[] = ["A", "B", "C", "SOCI"];

export interface ClientiFilters {
  search?: string;
  agente_id?: string | null;
  filiale?: string | null;
  fascia?: FasciaListino | null;
}

export type ClienteRow = Cliente & {
  agente: { id: string; nome: string } | null;
  comune: { id: string; nome: string; provincia: string | null } | null;
};

export async function fetchClienti(filters: ClientiFilters, limit = 1000): Promise<ClienteRow[]> {
  let q = supabase
    .from("clienti")
    .select("*, agente:agenti(id, nome), comune:comuni(id, nome, provincia)")
    .order("ragione_sociale", { ascending: true })
    .limit(limit);

  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim().replace(/[%,]/g, " ");
    q = q.or(`ragione_sociale.ilike.%${s}%,id_cliente.ilike.%${s}%,piva.ilike.%${s}%`);
  }
  if (filters.agente_id) q = q.eq("agente_id", filters.agente_id);
  if (filters.filiale) q = q.eq("filiale", filters.filiale);
  if (filters.fascia) q = q.eq("fascia_listino_default", filters.fascia);

  const { data, error } = await q;
  if (error) throw error;
  return (data as ClienteRow[] | null) ?? [];
}

export async function fetchCliente(id: string): Promise<ClienteRow | null> {
  const { data, error } = await supabase
    .from("clienti")
    .select("*, agente:agenti(id, nome), comune:comuni(id, nome, provincia)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ClienteRow | null) ?? null;
}

export async function createCliente(row: ClienteInsert): Promise<Cliente> {
  const { data, error } = await supabase.from("clienti").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateCliente(id: string, patch: ClienteUpdate): Promise<Cliente> {
  const { data, error } = await supabase
    .from("clienti")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from("clienti").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchClientiFacets(): Promise<{ filiali: string[] }> {
  const { data, error } = await supabase.from("clienti").select("filiale").limit(5000);
  if (error) throw error;
  const filiali = new Set<string>();
  for (const r of data ?? []) if (r.filiale) filiali.add(r.filiale);
  return { filiali: [...filiali].sort() };
}

export async function fetchAgenti(): Promise<Agente[]> {
  const { data, error } = await supabase.from("agenti").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function searchComuni(q: string, limit = 30): Promise<Comune[]> {
  let qb = supabase.from("comuni").select("*").order("nome").limit(limit);
  const s = q.trim();
  if (s) qb = qb.ilike("nome", `%${s}%`);
  const { data, error } = await qb;
  if (error) throw error;
  return data ?? [];
}

export async function fetchComune(id: string): Promise<Comune | null> {
  const { data, error } = await supabase.from("comuni").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

// ---- Cantieri ----

export async function fetchCantieri(cliente_id: string): Promise<(Cantiere & { comune: { id: string; nome: string; provincia: string | null } | null })[]> {
  const { data, error } = await supabase
    .from("cantieri")
    .select("*, comune:comuni(id, nome, provincia)")
    .eq("cliente_id", cliente_id)
    .order("nome");
  if (error) throw error;
  return (data as never) ?? [];
}

export async function createCantiere(row: CantiereInsert): Promise<Cantiere> {
  const { data, error } = await supabase.from("cantieri").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateCantiere(id: string, patch: CantiereUpdate): Promise<Cantiere> {
  const { data, error } = await supabase
    .from("cantieri")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCantiere(id: string): Promise<void> {
  const { error } = await supabase.from("cantieri").delete().eq("id", id);
  if (error) throw error;
}
