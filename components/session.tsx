"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type SessionValue = {
  supabase: SupabaseClient;
  user: User;
  profile: Profile;
  reload: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Fuera de sesión");
  return value;
}

export function SessionProvider({
  supabase,
  user,
  profile,
  reload,
  children,
}: SessionValue & { children: React.ReactNode }) {
  return <SessionContext.Provider value={{ supabase, user, profile, reload }}>{children}</SessionContext.Provider>;
}

export function useAuthState() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const { data: auth } = await supabase.auth.getUser();
    setUser(auth.user);
    if (!auth.user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, active, created_at")
      .eq("id", auth.user.id)
      .maybeSingle();
    setError(profileError?.message ?? null);
    setProfile((data as Profile | null) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    let alive = true;
    reload().catch((reason: unknown) => {
      if (!alive) return;
      setError(reason instanceof Error ? reason.message : "No se pudo abrir la sesión");
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // The client is stable for the lifetime of the panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { supabase, loading, user, profile, error, reload };
}
