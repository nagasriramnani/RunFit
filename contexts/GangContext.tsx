import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

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
  isActive: boolean;
  isRunning: boolean;
  liveLocation: MemberLocation | null;
  profilePicture?: string | null;
}

interface GangContextValue {
  gangName: string;
  gangMembers: GangMember[];
  isLoading: boolean;
  myInviteCode: string | null;
  addMemberFromInvite: (code: string) => Promise<{ success: boolean; friendName?: string; error?: string }>;
  removeMember: (id: string) => void;
  updateMyLocation: (lat: number, lng: number, isTracking: boolean) => void;
  refreshFriends: () => Promise<void>;
}

const GangContext = createContext<GangContextValue | null>(null);

export function GangProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // We are keeping friends as an array for now
  const [friendIds, setFriendIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadFriendsList();
    } else {
      setGangMembers([]);
      setFriendIds([]);
    }
  }, [user]);

  const loadFriendsList = async () => {
    if (!user) return;
    setIsLoading(true);
    // Grab all friendships where I am involved
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_id, friend_id")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (friendships) {
      const ids = friendships.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
      setFriendIds(ids);

      // Load static data
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, color_index, streak, total_km, zones_owned, profile_picture")
          .in("id", ids);

        if (profiles) {
          setGangMembers(
            profiles.map(p => ({
              id: p.id,
              name: p.username,
              colorIndex: p.color_index,
              zonesOwned: p.zones_owned,
              totalKm: p.total_km,
              streak: p.streak,
              isActive: false,  // Set by realtime presence
              isRunning: false, // Set by realtime presence
              liveLocation: null,
              profilePicture: p.profile_picture,
            }))
          );
        }
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!user || !session) return;

    // Subscribe to presence!
    const channel = supabase.channel('gang-presence', {
      config: {
        presence: {
          key: user.id
        }
      }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();

      setGangMembers(curr => curr.map(member => {
        // Did we get a presence state for this member?
        const stateArray = presenceState[member.id];
        if (stateArray && stateArray.length > 0) {
          // Take the most recent/highest priority state
          const latest: any = stateArray[0];
          return {
            ...member,
            isActive: true,
            isRunning: !!latest.isTracking,
            liveLocation: latest.lat && latest.lng ? { latitude: latest.lat, longitude: latest.lng } : null
          };
        } else {
          return {
            ...member,
            isActive: false,
            isRunning: false,
            liveLocation: null
          };
        }
      }));
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, session]);

  const refreshFriends = useCallback(async () => {
    await loadFriendsList();
  }, [user]);

  const addMemberFromInvite = useCallback(
    async (code: string): Promise<{ success: boolean; friendName?: string; error?: string }> => {
      if (!user) return { success: false, error: "Not logged in" };

      const { data: friendProfile, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("invite_code", code.trim())
        .single();

      if (error || !friendProfile) return { success: false, error: "Invalid code" };
      if (friendProfile.id === user.id) return { success: false, error: "Cannot add yourself" };

      const { error: insertErr } = await supabase
        .from("friendships")
        .insert({ user_id: user.id, friend_id: friendProfile.id });

      if (insertErr && !insertErr.message.includes("duplicate key")) {
        return { success: false, error: "Failed to add friend" };
      }

      await loadFriendsList();
      return { success: true, friendName: friendProfile.username };
    },
    [user]
  );

  const removeMember = useCallback(
    async (id: string) => {
      if (!user) return;
      setGangMembers((prev) => prev.filter((m) => m.id !== id));

      await supabase
        .from("friendships")
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user.id})`);
    },
    [user]
  );

  const updateMyLocation = useCallback(
    (lat: number, lng: number, isTracking: boolean) => {
      if (!user) return;

      // We will broadcast our location via Supabase Realtime Track
      supabase.channel('gang-presence').track({
        id: user.id,
        lat,
        lng,
        isTracking,
        updatedAt: new Date().toISOString() // Force state change
      });
    },
    [user]
  );

  const value = useMemo(
    () => ({
      gangName: "My Crew",
      gangMembers,
      isLoading,
      myInviteCode: user?.inviteCode || "Loading...",
      addMemberFromInvite,
      removeMember,
      updateMyLocation,
      refreshFriends,
    }),
    [gangMembers, isLoading, user, addMemberFromInvite, removeMember, updateMyLocation, refreshFriends]
  );

  return <GangContext.Provider value={value}>{children}</GangContext.Provider>;
}

export function useGang() {
  const ctx = useContext(GangContext);
  if (!ctx) throw new Error("useGang must be used within GangProvider");
  return ctx;
}
