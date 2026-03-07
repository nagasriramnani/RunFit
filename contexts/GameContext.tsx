import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  ReactNode,
  useCallback,
} from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { useGang } from "@/contexts/GangContext";

export interface ZoneCoord {
  latitude: number;
  longitude: number;
}

export interface Zone {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  colorIndex: number;
  health: number;
  maxHealth: number;
  streak: number;
  coords: ZoneCoord[];
  centerLat: number;
  centerLng: number;
  status: "owned" | "under_attack" | "contested";
  attackerName?: string;
  attackProgress?: number;
  claimedAt: number;
  kmRun: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  colorIndex: number;
  zonesOwned: number;
  totalKm: number;
  streak: number;
  rank: number;
  city?: string;
  profilePicture?: string | null;
}

interface TrackingState {
  isTracking: boolean;
  isPaused: boolean;
  speedKmh: number;
  currentKm: number;
  speedWarning: boolean;
  coords: ZoneCoord[];
  coveredArea: ZoneCoord[];
}

interface GameContextValue {
  zones: Zone[];
  leaderboard: LeaderboardEntry[];
  tracking: TrackingState;
  currentLocation: ZoneCoord | null;
  playerName: string;
  playerColorIndex: number;
  playerStreak: number;
  playerTotalKm: number;
  playerZonesOwned: number;
  playerZones: Zone[];
  activeThreats: Zone[];
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  locationPermission: boolean;
  requestLocationPermission: () => Promise<void>;
  fetchLeaderboard: (city?: string) => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

function calcDistance(a: ZoneCoord, b: ZoneCoord): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { serverUserId, apiUrl } = useGang();
  const [zones] = useState<Zone[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [locationPermission, setLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<ZoneCoord | null>(null);
  const [tracking, setTracking] = useState<TrackingState>({
    isTracking: false,
    isPaused: false,
    speedKmh: 0,
    currentKm: 0,
    speedWarning: false,
    coords: [],
    coveredArea: [],
  });

  const [playerStreak, setPlayerStreak] = useState(0);
  const [playerTotalKm, setPlayerTotalKm] = useState(0);
  const [playerZonesOwned, setPlayerZonesOwned] = useState(0);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const bgLocationSubscription = useRef<Location.LocationSubscription | null>(null);
  const speedWarningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCoord = useRef<ZoneCoord | null>(null);

  const playerZones = useMemo(() => zones.filter((z) => z.ownerId === "player"), [zones]);
  const activeThreats = useMemo(
    () => zones.filter((z) => z.ownerId === "player" && z.status === "under_attack"),
    [zones]
  );

  useEffect(() => {
    if (serverUserId) {
      fetchMyStats();
      fetchLeaderboard();
    }
  }, [serverUserId]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      checkLocationPermission();
      startBackgroundLocationWatch();
    }
  }, []);

  async function fetchMyStats() {
    if (!serverUserId) return;
    try {
      const resp = await fetch(apiUrl("/api/users/me"), {
        headers: { "x-user-id": serverUserId },
      });
      if (resp.ok) {
        const data = await resp.json();
        setPlayerTotalKm(data.totalKm || 0);
        setPlayerStreak(data.streak || 0);
        setPlayerZonesOwned(data.zonesOwned || 0);
      }
    } catch (e) {
      console.error("Fetch stats error:", e);
    }
  }

  const fetchLeaderboard = useCallback(async (city?: string) => {
    try {
      const cityParam = city || "all";
      const resp = await fetch(apiUrl(`/api/leaderboard?city=${encodeURIComponent(cityParam)}`));
      if (resp.ok) {
        const data = await resp.json();
        setLeaderboard(data.entries || []);
      }
    } catch (e) {
      console.error("Fetch leaderboard error:", e);
    }
  }, []);

  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === "granted") {
      setLocationPermission(true);
    }
  };

  const startBackgroundLocationWatch = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return;
    bgLocationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 3000,
        distanceInterval: 10,
      },
      (loc) => {
        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    );
  };

  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === "web") {
      setLocationPermission(true);
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      setLocationPermission(true);
      startBackgroundLocationWatch();
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (Platform.OS === "web") {
      setTracking((t) => ({ ...t, isTracking: true, isPaused: false, currentKm: 0, coords: [], coveredArea: [] }));
      return;
    }
    if (!locationPermission) {
      await requestLocationPermission();
      return;
    }

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const startCoord: ZoneCoord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    lastCoord.current = startCoord;

    setCurrentLocation(startCoord);
    setTracking((t) => ({
      ...t,
      isTracking: true,
      isPaused: false,
      currentKm: 0,
      coords: [startCoord],
      coveredArea: [startCoord],
      speedKmh: 0,
      speedWarning: false,
    }));

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 3,
      },
      (location) => {
        const speedMs = location.coords.speed ?? 0;
        const speedKmh = Math.max(0, speedMs * 3.6);
        const coord: ZoneCoord = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setCurrentLocation(coord);

        const isOverSpeed = speedKmh > 14.5;
        if (isOverSpeed) {
          if (speedWarningTimer.current) clearTimeout(speedWarningTimer.current);
          setTracking((t) => ({ ...t, isPaused: true, speedWarning: true, speedKmh }));
          speedWarningTimer.current = setTimeout(() => {
            setTracking((t) => ({ ...t, speedWarning: false }));
          }, 3500);
          lastCoord.current = null;
          return;
        }

        setTracking((t) => {
          let addedKm = 0;
          if (lastCoord.current && !t.isPaused) {
            addedKm = calcDistance(lastCoord.current, coord);
          }
          lastCoord.current = coord;

          const newCoords = [...t.coords, coord];
          const newCovered = buildConvexHull([...t.coveredArea, coord]);

          return {
            ...t,
            isPaused: false,
            speedWarning: false,
            speedKmh,
            currentKm: t.currentKm + addedKm,
            coords: newCoords,
            coveredArea: newCovered,
          };
        });
      }
    );
  }, [locationPermission, requestLocationPermission]);

  const stopTracking = useCallback(() => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;

    setTracking((prev) => {
      const kmRan = prev.currentKm;
      if (kmRan > 0.01 && serverUserId) {
        fetch(apiUrl("/api/users/stats"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": serverUserId,
          },
          body: JSON.stringify({ addKm: kmRan }),
        })
          .then((r) => r.json())
          .then((data) => {
            setPlayerTotalKm(data.totalKm || 0);
            setPlayerStreak(data.streak || 0);
            setPlayerZonesOwned(data.zonesOwned || 0);
            fetchLeaderboard();
          })
          .catch(console.error);
      }

      return {
        ...prev,
        isTracking: false,
        isPaused: false,
        speedKmh: 0,
      };
    });
  }, [serverUserId, fetchLeaderboard]);

  const value = useMemo(
    () => ({
      zones,
      leaderboard,
      tracking,
      currentLocation,
      playerName: "You",
      playerColorIndex: 0,
      playerStreak,
      playerTotalKm,
      playerZonesOwned,
      playerZones,
      activeThreats,
      startTracking,
      stopTracking,
      locationPermission,
      requestLocationPermission,
      fetchLeaderboard,
    }),
    [zones, leaderboard, tracking, currentLocation, playerStreak, playerTotalKm, playerZonesOwned, playerZones, activeThreats, startTracking, stopTracking, locationPermission, requestLocationPermission, fetchLeaderboard]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

function buildConvexHull(points: ZoneCoord[]): ZoneCoord[] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) =>
    a.latitude !== b.latitude ? a.latitude - b.latitude : a.longitude - b.longitude
  );

  function cross(O: ZoneCoord, A: ZoneCoord, B: ZoneCoord): number {
    return (
      (A.latitude - O.latitude) * (B.longitude - O.longitude) -
      (A.longitude - O.longitude) * (B.latitude - O.latitude)
    );
  }

  const lower: ZoneCoord[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: ZoneCoord[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
