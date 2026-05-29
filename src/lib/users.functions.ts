import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = ["admin", "commerciale", "lettura"] as const;
type AppRole = (typeof ROLES)[number];

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Solo gli amministratori possono eseguire questa operazione");
}

async function setSingleRole(user_id: string, role: AppRole) {
  const { error: e1 } = await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabaseAdmin.from("user_roles").insert({ user_id, role });
  if (e2) throw new Error(e2.message);
}

/**
 * Crea un utente con password impostata dall'admin.
 * L'utente è subito attivo (email_confirm: true).
 */
export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(8).max(72),
      nome: z.string().min(1).max(100),
      cognome: z.string().min(1).max(100),
      ruolo: z.enum(ROLES),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: `${data.nome} ${data.cognome}`.trim() },
    });
    if (error) throw new Error(error.message);
    const uid = created.user?.id;
    if (!uid) throw new Error("Creazione utente fallita");

    // handle_new_user trigger crea già profiles + ruolo di default.
    // Aggiorna nome/cognome/email su profiles e imposta il ruolo richiesto.
    const { error: e2 } = await supabaseAdmin
      .from("profiles")
      .update({ nome: data.nome, cognome: data.cognome, email: data.email })
      .eq("id", uid);
    if (e2) throw new Error(e2.message);

    await setSingleRole(uid, data.ruolo);

    return { user_id: uid };
  });

/**
 * Aggiorna i dati anagrafici, email, password e/o ruolo di un utente.
 */
export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      nome: z.string().min(1).max(100).optional(),
      cognome: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
      password: z.string().min(8).max(72).optional(),
      ruolo: z.enum(ROLES).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Auth update (email/password)
    if (data.email || data.password) {
      const payload: { email?: string; password?: string } = {};
      if (data.email) payload.email = data.email;
      if (data.password) payload.password = data.password;
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, payload);
      if (error) throw new Error(error.message);
    }

    // Profili
    const profileUpdate: Record<string, string> = {};
    if (data.nome !== undefined) profileUpdate.nome = data.nome;
    if (data.cognome !== undefined) profileUpdate.cognome = data.cognome;
    if (data.email !== undefined) profileUpdate.email = data.email;
    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("id", data.user_id);
      if (error) throw new Error(error.message);
    }

    // Ruolo
    if (data.ruolo) {
      if (data.user_id === context.userId && data.ruolo !== "admin") {
        throw new Error("Non puoi rimuovere il tuo ruolo di amministratore");
      }
      await setSingleRole(data.user_id, data.ruolo);
    }

    return { ok: true };
  });

/**
 * Sospende o riattiva un utente.
 * - sospeso=true: banna l'accesso (100 anni) e setta profiles.disabled=true
 * - sospeso=false: rimuove il ban e setta profiles.disabled=false
 */
export const adminSuspendUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      sospeso: z.boolean(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.user_id === context.userId && data.sospeso) {
      throw new Error("Non puoi sospendere te stesso");
    }

    const { error: e1 } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.sospeso ? "876000h" : "none",
    });
    if (e1) throw new Error(e1.message);

    const { error: e2 } = await supabaseAdmin
      .from("profiles")
      .update({ disabled: data.sospeso })
      .eq("id", data.user_id);
    if (e2) throw new Error(e2.message);

    return { ok: true };
  });

/**
 * Elimina definitivamente un utente (auth + cascade su profili/ruoli).
 */
export const deleteAuthUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ user_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.user_id === context.userId) throw new Error("Non puoi eliminare te stesso");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Mantenuto per retrocompatibilità con la UI esistente.
 * @deprecated Usa adminCreateUser per il nuovo flusso a password manuale.
 */
export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      email: z.string().email(),
      display_name: z.string().min(1).max(100).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const origin = process.env.SITE_URL ?? process.env.SUPABASE_URL ?? "";
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.display_name ?? data.email },
      redirectTo: origin ? `${origin}/reset-password` : undefined,
    });
    if (error) throw new Error(error.message);
    return { user_id: invited.user?.id ?? null };
  });
