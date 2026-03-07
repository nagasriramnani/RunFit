import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";

export interface MemberLocation {
  latitude: number;
  longitude: number;
}

export interface GangMember {
  id: string;
  name: string;
  colorIndex: number;
  zonesOwned: number;
  totalKm: number;
  streak: number;
  joinedAt: number;
  isActive: boolean;
  isRunning: boolean;
  liveLocation: MemberLocation | null;
  runningPath: MemberLocation[];
}

interface GangContextValue {
  gangName: string;
  gangMembers: GangMember[];
  isLoading: boolean;
  serverUserId: string | null;
  myInviteCode: string | null;
  addMemberFromInvite: (code: string) => Promise<{ success: boolean; friendName?: string; error?: string }>;
  removeMember: (id: string) => void;
  generateInviteCode: () => Promise<string>;
  setBaseLocation: (loc: MemberLocation) => void;
  registerUser: (name: string, email: string, city: string, colorIndex: number) => Promise<void>;
  updateMyLocation: (lat: number, lng: number, isTracking: boolean) => void;
  refreshFriends: () => Promise<void>;
}

const GangContext = createContext<GangContextValue | null>(null);
const SERVER_USER_KEY = "@daudlo_server_user";

function apiUrl(path: string): string {
  try {
    const base = getApiUrl();
    return new URL(path, base).toString();
  } catch {
    return `https://localhost:5000${path}`;
  }
}

export function GangProvider({ children }: { children: ReactNode }) {
  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverUserId, setServerUserId] = useState<string | null>(null);
  const [myInviteCode, setMyInviteCode] = useState<string | null>(null);
  const baseLocationRef = useRef<MemberLocation | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadServerUser();
  }, []);

  useEffect(() => {
    if (serverUserId) {
      fetchFriends();
      refreshIntervalRef.current = setInterval(fetchFriends, 5000);
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [serverUserId]);

  async function loadServerUser() {
    try {
      const raw = await AsyncStorage.getItem(SERVER_USER_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setServerUserId(data.id);
        setMyInviteCode(data.inviteCode);
      }
    } catch (e) {
      console.error("Load server user error:", e);
    } finally {
      setIsLoading(false);
    }
  }

  const registerUser = useCallback(
    async (name: string, email: string, city: string, colorIndex: number) => {
      try {
        const resp = await fetch(apiUrl("/api/users/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, city, colorIndex }),
        });
        if (!resp.ok) {
          console.error("Register failed:", await resp.text());
          return;
        }
        const data = await resp.json();
        setServerUserId(data.id);
        setMyInviteCode(data.inviteCode);
        await AsyncStorage.setItem(
          SERVER_USER_KEY,
          JSON.stringify({ id: data.id, inviteCode: data.inviteCode })
        );
      } catch (e) {
        console.error("Register error:", e);
      }
    },
    []
  );

  async function fetchFriends() {
    if (!serverUserId) return;
    try {
      const resp = await fetch(apiUrl("/api/users/friends"), {
        headers: { "x-user-id": serverUserId },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const now = Date.now();
      const members: GangMember[] = (data.friends || []).map((f: any) => {
        const isActive = f.isActive && now - f.lastSeen < 120000;
        const isRunning = isActive && f.isTracking;
        const hasLocation = f.lastLat != null && f.lastLng != null;
        const liveLocation =
          isActive && hasLocation
            ? { latitude: f.lastLat, longitude: f.lastLng }
            : null;
        return {
          id: f.id,
          name: f.name,
          colorIndex: f.colorIndex,
          zonesOwned: 0,
          totalKm: 0,
          streak: 0,
          joinedAt: f.lastSeen || now,
          isActive,
          isRunning,
          liveLocation,
          runningPath: [],
        };
      });
      setGangMembers(members);
    } catch (e) {
      console.error("Fetch friends error:", e);
    }
  }

  const refreshFriends = useCallback(async () => {
    await fetchFriends();
  }, [serverUserId]);

  const setBaseLocation = useCallback((loc: MemberLocation) => {
    baseLocationRef.current = loc;
  }, []);

  const generateInviteCode = useCallback(async (): Promise<string> => {
    if (myInviteCode) return myInviteCode;
    if (!serverUserId) return "Loading...";
    try {
      const resp = await fetch(apiUrl("/api/users/invite-code"), {
        headers: { "x-user-id": serverUserId },
      });
      if (resp.ok) {
        const data = await resp.json();
        setMyInviteCode(data.inviteCode);
        return data.inviteCode;
      }
    } catch (e) {
      console.error("Get invite code error:", e);
    }
    return myInviteCode || "Error";
  }, [serverUserId, myInviteCode]);

  const addMemberFromInvite = useCallback(
    async (code: string): Promise<{ success: boolean; friendName?: string; error?: string }> => {
      if (!serverUserId) return { success: false, error: "Not registered yet" };
      try {
        const resp = await fetch(apiUrl("/api/users/join"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": serverUserId,
          },
          body: JSON.stringify({ code: code.trim() }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          return { success: false, error: data.error || "Failed to join" };
        }
        await fetchFriends();
        return { success: true, friendName: data.friend?.name };
      } catch (e: any) {
        console.error("Join error:", e);
        return { success: false, error: e.message || "Network error" };
      }
    },
    [serverUserId]
  );

  const removeMember = useCallback(
    (id: string) => {
      if (!serverUserId) return;
      setGangMembers((prev) => prev.filter((m) => m.id !== id));
      fetch(apiUrl(`/api/users/friends/${id}`), {
        method: "DELETE",
        headers: { "x-user-id": serverUserId },
      }).catch(console.error);
    },
    [serverUserId]
  );

  const updateMyLocation = useCallback(
    (lat: number, lng: number, isTracking: boolean) => {
      if (!serverUserId) return;
      if (locationUpdateRef.current) clearTimeout(locationUpdateRef.current);
      locationUpdateRef.current = setTimeout(() => {
        fetch(apiUrl("/api/users/location"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": serverUserId,
          },
          body: JSON.stringify({ latitude: lat, longitude: lng, isTracking }),
        }).catch(console.error);
      }, 500);
    },
    [serverUserId]
  );

  const value = useMemo(
    () => ({
      gangName: "My Gang",
      gangMembers,
      isLoading,
      serverUserId,
      myInviteCode,
      addMemberFromInvite,
      removeMember,
      generateInviteCode,
      setBaseLocation,
      registerUser,
      updateMyLocation,
      refreshFriends,
    }),
    [
      gangMembers,
      isLoading,
      serverUserId,
      myInviteCode,
      addMemberFromInvite,
      removeMember,
      generateInviteCode,
      setBaseLocation,
      registerUser,
      updateMyLocation,
      refreshFriends,
    ]
  );

  return <GangContext.Provider value={value}>{children}</GangContext.Provider>;
}

export function useGang() {
  const ctx = useContext(GangContext);
  if (!ctx) throw new Error("useGang must be used within GangProvider");
  return ctx;
}
