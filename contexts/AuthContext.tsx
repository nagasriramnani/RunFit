import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  city: string;
  colorIndex: number;
  joinedAt: number;
}

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  signIn: (profile: Omit<UserProfile, "id" | "joinedAt">) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_KEY = "@daudlo_user";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const raw = await AsyncStorage.getItem(AUTH_KEY);
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to load user", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(profile: Omit<UserProfile, "id" | "joinedAt">) {
    const newUser: UserProfile = {
      ...profile,
      id: generateId(),
      joinedAt: Date.now(),
    };
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }

  async function signOut() {
    await AsyncStorage.removeItem(AUTH_KEY);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
