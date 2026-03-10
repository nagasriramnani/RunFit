import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  city: string;
  colorIndex: number;
  streak: number;
  totalKm: number;
  zonesOwned: number;
  inviteCode: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, pass: string, name: string, city: string, colorIndex: number) => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id, session.user.email);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          loadProfile(session.user.id, session.user.email);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string, email: string | undefined) {
    setIsLoading(true);
    try {
      // Loop with delay in case trigger hasn't fired yet
      let profileData = null;
      for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        if (data) {
          profileData = data;
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      if (profileData) {
        setUser({
          id: profileData.id,
          name: profileData.username,
          email: email || "",
          city: profileData.city,
          colorIndex: profileData.color_index,
          streak: profileData.streak,
          totalKm: profileData.total_km,
          zonesOwned: profileData.zones_owned,
          inviteCode: profileData.invite_code,
        });
      } else {
        // Recovery mechanism: If auth user exists but profile row failed or was deleted
        const fallbackId = userId.substring(0, 8);
        const fallbackInvite = userId.substring(0, 6);
        const { data: newMeta, error: metaErr } = await supabase.from('profiles').insert({
          id: userId,
          username: `user_${fallbackId}`,
          invite_code: fallbackInvite,
          city: 'Global',
          color_index: 0
        }).select().single();

        if (newMeta) {
          setUser({
            id: newMeta.id,
            name: newMeta.username,
            email: email || "",
            city: newMeta.city,
            colorIndex: newMeta.color_index,
            streak: newMeta.streak,
            totalKm: newMeta.total_km,
            zonesOwned: newMeta.zones_owned,
            inviteCode: newMeta.invite_code,
          });
        }
      }
    } catch (e) {
      console.error("Failed to load profile", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function signUp(email: string, pass: string, name: string, city: string, colorIndex: number) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: {
          username: name.trim(),
          city: city,
          color_index: colorIndex
        },
      },
    });
    if (error) throw error;

    if (data.user) {
      // Brief pause to ensure the Postgres Trigger completes injecting the new profile row
      await new Promise((r) => setTimeout(r, 600));

      // If Auto-Confirm is on, Supabase returns the session instantly upon signup.
      // We explicitly set it so the app routes immediately to the map.
      if (data.session) {
        setSession(data.session);
      }

      await loadProfile(data.user.id, email);
    }
  }

  async function signIn(email: string, pass: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
