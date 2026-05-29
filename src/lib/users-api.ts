import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-auth";

export interface UserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  nome: string | null;
  cognome: string | null;
  disabled: boolean;
  created_at: string;
  roles: AppRole[];
}

export async function fetchUsers(): Promise<UserRow[]> {
  const [{ data: profs, error: e1 }, { data: ur, error: e2 }] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name, nome, cognome, disabled, created_at").order("created_at"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const byUser = new Map<string, AppRole[]>();
  for (const r of (ur ?? []) as { user_id: string; role: AppRole }[]) {
    const arr = byUser.get(r.user_id) ?? [];
    arr.push(r.role);
    byUser.set(r.user_id, arr);
  }
  return (profs ?? []).map((p) => ({ ...(p as Omit<UserRow, "roles">), roles: byUser.get(p.id) ?? [] }));
}

export async function setUserRole(user_id: string, role: AppRole) {
  // un ruolo per utente: rimuovi tutti, poi inserisci quello scelto
  const { error: e1 } = await supabase.from("user_roles").delete().eq("user_id", user_id);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("user_roles").insert({ user_id, role });
  if (e2) throw e2;
}

export async function toggleUserDisabled(user_id: string, disabled: boolean) {
  const { error } = await supabase.from("profiles").update({ disabled }).eq("id", user_id);
  if (error) throw error;
}

export async function updateDisplayName(user_id: string, display_name: string) {
  const { error } = await supabase.from("profiles").update({ display_name }).eq("id", user_id);
  if (error) throw error;
}
