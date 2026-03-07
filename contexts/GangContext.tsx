import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ZoneColors } from "@/constants/colors";

export interface GangMember {
  id: string;
  name: string;
  colorIndex: number;
  zonesOwned: number;
  totalKm: number;
  streak: number;
  joinedAt: number;
}

interface GangContextValue {
  gangName: string;
  gangMembers: GangMember[];
  isLoading: boolean;
  addMemberFromInvite: (code: string) => Promise<boolean>;
  removeMember: (id: string) => void;
  generateInviteCode: () => Promise<string>;
}

const GangContext = createContext<GangContextValue | null>(null);
const GANG_KEY = "@daudlo_gang";

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

const DEMO_FRIENDS: Record<string, Omit<GangMember, "id" | "joinedAt">> = {
  DAUDLO_INV_ROHIT: { name: "Rohit K.", colorIndex: 1, zonesOwned: 2, totalKm: 142, streak: 7 },
  DAUDLO_INV_PRIYA: { name: "Priya S.", colorIndex: 2, zonesOwned: 1, totalKm: 98, streak: 5 },
  DAUDLO_INV_ARJUN: { name: "Arjun M.", colorIndex: 4, zonesOwned: 2, totalKm: 178, streak: 9 },
};

export function GangProvider({ children }: { children: ReactNode }) {
  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGang();
  }, []);

  async function loadGang() {
    try {
      const raw = await AsyncStorage.getItem(GANG_KEY);
      if (raw) setGangMembers(JSON.parse(raw));
    } catch (e) {
      console.error("Gang load error", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function persist(members: GangMember[]) {
    await AsyncStorage.setItem(GANG_KEY, JSON.stringify(members));
  }

  const generateInviteCode = useCallback(async (): Promise<string> => {
    const code = "DAUDLO_" + makeId().toUpperCase();
    return code;
  }, []);

  const addMemberFromInvite = useCallback(async (code: string): Promise<boolean> => {
    const demo = DEMO_FRIENDS[code.trim().toUpperCase()];
    const newMember: GangMember = {
      id: makeId(),
      name: demo?.name ?? "Runner #" + makeId().substr(0, 4),
      colorIndex: demo?.colorIndex ?? Math.floor(Math.random() * 6),
      zonesOwned: demo?.zonesOwned ?? 0,
      totalKm: demo?.totalKm ?? 0,
      streak: demo?.streak ?? 1,
      joinedAt: Date.now(),
    };
    setGangMembers((prev) => {
      const updated = [...prev, newMember];
      persist(updated);
      return updated;
    });
    return true;
  }, []);

  const removeMember = useCallback((id: string) => {
    setGangMembers((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({
      gangName: "My Gang",
      gangMembers,
      isLoading,
      addMemberFromInvite,
      removeMember,
      generateInviteCode,
    }),
    [gangMembers, isLoading, addMemberFromInvite, removeMember, generateInviteCode]
  );

  return <GangContext.Provider value={value}>{children}</GangContext.Provider>;
}

export function useGang() {
  const ctx = useContext(GangContext);
  if (!ctx) throw new Error("useGang must be used within GangProvider");
  return ctx;
}
