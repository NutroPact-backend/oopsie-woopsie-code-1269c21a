// @ts-nocheck
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  ready: boolean;
  setAuth: (user: User | null, token: string | null, isAdmin?: boolean) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAdmin: false,
  ready: false,
  setAuth: (user, token, isAdmin = false) => set({ user, token, isAdmin }),
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, token: null, isAdmin: false });
  },
  refresh: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      set({ user: null, token: null, isAdmin: false, ready: true });
      return;
    }
    const u = session.user;
    const { data: profile } = await supabase.from("profiles").select("name,email").eq("id", u.id).maybeSingle();
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
    const isAdmin = !!roles?.some((r) => r.role === "admin");
    set({
      user: {
        id: u.id,
        name: profile?.name || (u.user_metadata?.name as string) || u.email?.split("@")[0] || "User",
        email: profile?.email || u.email || "",
        avatar: u.user_metadata?.avatar_url as string | undefined,
      },
      token: session.access_token,
      isAdmin,
      ready: true,
    });
  },
}));
