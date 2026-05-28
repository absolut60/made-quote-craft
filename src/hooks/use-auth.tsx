import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "commerciale" | "lettura";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  disabled: boolean;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  isCommerciale: boolean;
  canWrite: boolean; // admin || commerciale
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadProfileAndRoles(userId: string): Promise<{ profile: Profile | null; roles: AppRole[] }> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name, disabled").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  return {
    profile: (profile as Profile | null) ?? null,
    roles: ((roles as { role: AppRole }[] | null) ?? []).map((r) => r.role),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  async function hydrate(s: Session | null) {
    if (!s?.user) {
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }
    try {
      const { profile, roles } = await loadProfileAndRoles(s.user.id);
      if (profile?.disabled) {
        // Forza logout se l'utente è stato disattivato
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setRoles([]);
      } else {
        setProfile(profile);
        setRoles(roles);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Listener PRIMA, poi getSession (pattern Supabase ufficiale)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Defer fetch per non bloccare il listener
      setTimeout(() => { void hydrate(s); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void hydrate(data.session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("admin");
  const isCommerciale = roles.includes("commerciale");

  const value: AuthState = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    roles,
    isAdmin,
    isCommerciale,
    canWrite: isAdmin || isCommerciale,
    signOut: async () => { await supabase.auth.signOut(); },
    refresh: async () => {
      if (session?.user) await hydrate(session);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be used inside <AuthProvider>");
  return ctx;
}
