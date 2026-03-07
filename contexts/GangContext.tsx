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
import { ZoneColors } from "@/constants/colors";

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
  addMemberFromInvite: (code: string) => Promise<boolean>;
  removeMember: (id: string) => void;
  generateInviteCode: () => Promise<string>;
  setBaseLocation: (loc: MemberLocation) => void;
}

const GangContext = createContext<GangContextValue | null>(null);
const GANG_KEY = "@daudlo_gang";

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

interface StoredMember {
  id: string;
  name: string;
  colorIndex: number;
  zonesOwned: number;
  totalKm: number;
  streak: number;
  joinedAt: number;
}

const DEMO_FRIENDS: Record<string, Omit<StoredMember, "id" | "joinedAt">> = {
  DAUDLO_INV_ROHIT: { name: "Rohit K.", colorIndex: 1, zonesOwned: 2, totalKm: 142, streak: 7 },
  DAUDLO_INV_PRIYA: { name: "Priya S.", colorIndex: 2, zonesOwned: 1, totalKm: 98, streak: 5 },
  DAUDLO_INV_ARJUN: { name: "Arjun M.", colorIndex: 4, zonesOwned: 2, totalKm: 178, streak: 9 },
  DAUDLO_INV_NEHA: { name: "Neha R.", colorIndex: 3, zonesOwned: 1, totalKm: 65, streak: 2 },
  DAUDLO_INV_VIKRAM: { name: "Vikram P.", colorIndex: 5, zonesOwned: 0, totalKm: 44, streak: 1 },
};

function randomOffset(range: number) {
  return (Math.random() - 0.5) * range;
}

function generateRunningPath(center: MemberLocation, numPoints: number): MemberLocation[] {
  const path: MemberLocation[] = [];
  let lat = center.latitude + randomOffset(0.005);
  let lng = center.longitude + randomOffset(0.005);
  for (let i = 0; i < numPoints; i++) {
    lat += randomOffset(0.001);
    lng += randomOffset(0.001);
    path.push({ latitude: lat, longitude: lng });
  }
  return path;
}

function hydrateMember(stored: StoredMember, baseLoc: MemberLocation | null): GangMember {
  const isActive = Math.random() > 0.25;
  const isRunning = isActive && Math.random() > 0.5;

  const center: MemberLocation = baseLoc
    ? { latitude: baseLoc.latitude + randomOffset(0.03), longitude: baseLoc.longitude + randomOffset(0.03) }
    : { latitude: 19.076 + randomOffset(0.03), longitude: 72.877 + randomOffset(0.03) };

  const liveLocation = isActive ? center : null;
  const runningPath = isRunning ? generateRunningPath(center, 8 + Math.floor(Math.random() * 12)) : [];

  return {
    ...stored,
    isActive,
    isRunning,
    liveLocation,
    runningPath,
  };
}

export function GangProvider({ children }: { children: ReactNode }) {
  const [storedMembers, setStoredMembers] = useState<StoredMember[]>([]);
  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const baseLocationRef = useRef<MemberLocation | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadGang();
  }, []);

  useEffect(() => {
    if (storedMembers.length > 0) {
      refreshLiveStatus();
      intervalRef.current = setInterval(refreshLiveStatus, 15000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [storedMembers]);

  function refreshLiveStatus() {
    setGangMembers(storedMembers.map((m) => hydrateMember(m, baseLocationRef.current)));
  }

  async function loadGang() {
    try {
      const raw = await AsyncStorage.getItem(GANG_KEY);
      if (raw) {
        const loaded: StoredMember[] = JSON.parse(raw);
        setStoredMembers(loaded);
        setGangMembers(loaded.map((m) => hydrateMember(m, baseLocationRef.current)));
      }
    } catch (e) {
      console.error("Gang load error", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function persist(members: StoredMember[]) {
    await AsyncStorage.setItem(GANG_KEY, JSON.stringify(members));
  }

  const setBaseLocation = useCallback((loc: MemberLocation) => {
    baseLocationRef.current = loc;
  }, []);

  const generateInviteCode = useCallback(async (): Promise<string> => {
    const code = "DAUDLO_" + makeId().toUpperCase();
    return code;
  }, []);

  const addMemberFromInvite = useCallback(async (code: string): Promise<boolean> => {
    const trimmed = code.trim().toUpperCase();
    const demo = DEMO_FRIENDS[trimmed];
    const stored: StoredMember = {
      id: makeId(),
      name: demo?.name ?? "Runner " + trimmed.slice(-4),
      colorIndex: demo?.colorIndex ?? Math.floor(Math.random() * 6),
      zonesOwned: demo?.zonesOwned ?? 0,
      totalKm: demo?.totalKm ?? 0,
      streak: demo?.streak ?? 1,
      joinedAt: Date.now(),
    };
    setStoredMembers((prev) => {
      const updated = [...prev, stored];
      persist(updated);
      return updated;
    });
    const live = hydrateMember(stored, baseLocationRef.current);
    setGangMembers((prev) => [...prev, live]);
    return true;
  }, []);

  const removeMember = useCallback((id: string) => {
    setStoredMembers((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      persist(updated);
      return updated;
    });
    setGangMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      gangName: "My Gang",
      gangMembers,
      isLoading,
      addMemberFromInvite,
      removeMember,
      generateInviteCode,
      setBaseLocation,
    }),
    [gangMembers, isLoading, addMemberFromInvite, removeMember, generateInviteCode, setBaseLocation]
  );

  return <GangContext.Provider value={value}>{children}</GangContext.Provider>;
}

export function useGang() {
  const ctx = useContext(GangContext);
  if (!ctx) throw new Error("useGang must be used within GangProvider");
  return ctx;
}
