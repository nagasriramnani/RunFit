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
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Platform } from "react-native";

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

export interface Friend {
  id: string;
  name: string;
  colorIndex: number;
  wins: number;
  losses: number;
  zonesOwned: number;
  streak: number;
  totalKm: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  colorIndex: number;
  zonesOwned: number;
  totalKm: number;
  streak: number;
  rank: number;
}

export interface TrackingState {
  isTracking: boolean;
  isPaused: boolean;
  speedKmh: number;
  currentKm: number;
  speedWarning: boolean;
  coords: ZoneCoord[];
}

interface GameContextValue {
  zones: Zone[];
  friends: Friend[];
  leaderboard: LeaderboardEntry[];
  tracking: TrackingState;
  playerName: string;
  playerColorIndex: number;
  playerStreak: number;
  playerTotalKm: number;
  playerZones: Zone[];
  activeThreats: Zone[];
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  locationPermission: boolean;
  requestLocationPermission: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

const MUMBAI_ZONES: Omit<Zone, "id">[] = [
  {
    name: "Marine Drive",
    ownerId: "player",
    ownerName: "You",
    colorIndex: 0,
    health: 87,
    maxHealth: 100,
    streak: 12,
    coords: [
      { latitude: 18.9435, longitude: 72.8215 },
      { latitude: 18.9475, longitude: 72.8195 },
      { latitude: 18.9510, longitude: 72.8230 },
      { latitude: 18.9490, longitude: 72.8265 },
      { latitude: 18.9450, longitude: 72.8260 },
    ],
    centerLat: 18.9472,
    centerLng: 72.8233,
    status: "owned",
    claimedAt: Date.now() - 12 * 86400000,
    kmRun: 18.4,
  },
  {
    name: "Dadar Park",
    ownerId: "player",
    ownerName: "You",
    colorIndex: 0,
    health: 43,
    maxHealth: 100,
    streak: 3,
    coords: [
      { latitude: 19.0140, longitude: 72.8410 },
      { latitude: 19.0180, longitude: 72.8390 },
      { latitude: 19.0210, longitude: 72.8430 },
      { latitude: 19.0175, longitude: 72.8460 },
      { latitude: 19.0145, longitude: 72.8450 },
    ],
    centerLat: 19.0170,
    centerLng: 72.8428,
    status: "under_attack",
    attackerName: "Rohit K.",
    attackProgress: 57,
    claimedAt: Date.now() - 3 * 86400000,
    kmRun: 7.2,
  },
  {
    name: "Bandra Fort",
    ownerId: "rohit",
    ownerName: "Rohit K.",
    colorIndex: 1,
    health: 91,
    maxHealth: 100,
    streak: 7,
    coords: [
      { latitude: 19.0540, longitude: 72.8210 },
      { latitude: 19.0580, longitude: 72.8190 },
      { latitude: 19.0610, longitude: 72.8225 },
      { latitude: 19.0590, longitude: 72.8255 },
      { latitude: 19.0550, longitude: 72.8250 },
    ],
    centerLat: 19.0574,
    centerLng: 72.8226,
    status: "owned",
    claimedAt: Date.now() - 7 * 86400000,
    kmRun: 14.8,
  },
  {
    name: "Juhu Beach",
    ownerId: "priya",
    ownerName: "Priya S.",
    colorIndex: 2,
    health: 65,
    maxHealth: 100,
    streak: 5,
    coords: [
      { latitude: 19.0940, longitude: 72.8280 },
      { latitude: 19.0980, longitude: 72.8260 },
      { latitude: 19.1010, longitude: 72.8290 },
      { latitude: 19.0990, longitude: 72.8330 },
      { latitude: 19.0950, longitude: 72.8320 },
    ],
    centerLat: 19.0974,
    centerLng: 72.8296,
    status: "owned",
    claimedAt: Date.now() - 5 * 86400000,
    kmRun: 11.5,
  },
  {
    name: "Carter Road",
    ownerId: "arjun",
    ownerName: "Arjun M.",
    colorIndex: 4,
    health: 78,
    maxHealth: 100,
    streak: 9,
    coords: [
      { latitude: 19.0670, longitude: 72.8280 },
      { latitude: 19.0700, longitude: 72.8260 },
      { latitude: 19.0725, longitude: 72.8290 },
      { latitude: 19.0705, longitude: 72.8315 },
      { latitude: 19.0675, longitude: 72.8310 },
    ],
    centerLat: 19.0695,
    centerLng: 72.8291,
    status: "owned",
    claimedAt: Date.now() - 9 * 86400000,
    kmRun: 16.2,
  },
  {
    name: "Shivaji Park",
    ownerId: "player",
    ownerName: "You",
    colorIndex: 0,
    health: 100,
    maxHealth: 100,
    streak: 21,
    coords: [
      { latitude: 19.0260, longitude: 72.8380 },
      { latitude: 19.0290, longitude: 72.8360 },
      { latitude: 19.0315, longitude: 72.8390 },
      { latitude: 19.0300, longitude: 72.8415 },
      { latitude: 19.0268, longitude: 72.8408 },
    ],
    centerLat: 19.0287,
    centerLng: 72.8391,
    status: "owned",
    claimedAt: Date.now() - 21 * 86400000,
    kmRun: 34.7,
  },
  {
    name: "Versova",
    ownerId: "neha",
    ownerName: "Neha R.",
    colorIndex: 3,
    health: 55,
    maxHealth: 100,
    streak: 2,
    coords: [
      { latitude: 19.1310, longitude: 72.8130 },
      { latitude: 19.1350, longitude: 72.8110 },
      { latitude: 19.1375, longitude: 72.8145 },
      { latitude: 19.1355, longitude: 72.8170 },
      { latitude: 19.1318, longitude: 72.8162 },
    ],
    centerLat: 19.1342,
    centerLng: 72.8143,
    status: "contested",
    attackerName: "Arjun M.",
    attackProgress: 45,
    claimedAt: Date.now() - 2 * 86400000,
    kmRun: 5.9,
  },
];

const FRIENDS_DATA: Friend[] = [
  { id: "rohit", name: "Rohit K.", colorIndex: 1, wins: 3, losses: 5, zonesOwned: 2, streak: 7, totalKm: 142.3 },
  { id: "priya", name: "Priya S.", colorIndex: 2, wins: 2, losses: 4, zonesOwned: 1, streak: 5, totalKm: 98.7 },
  { id: "arjun", name: "Arjun M.", colorIndex: 4, wins: 6, losses: 2, zonesOwned: 2, streak: 9, totalKm: 178.4 },
  { id: "neha", name: "Neha R.", colorIndex: 3, wins: 1, losses: 3, zonesOwned: 1, streak: 2, totalKm: 65.1 },
];

const LEADERBOARD_DATA: LeaderboardEntry[] = [
  { id: "arjun", name: "Arjun M.", colorIndex: 4, zonesOwned: 2, totalKm: 178.4, streak: 9, rank: 1 },
  { id: "player", name: "You", colorIndex: 0, zonesOwned: 3, totalKm: 156.8, streak: 21, rank: 2 },
  { id: "rohit", name: "Rohit K.", colorIndex: 1, zonesOwned: 2, totalKm: 142.3, streak: 7, rank: 3 },
  { id: "priya", name: "Priya S.", colorIndex: 2, zonesOwned: 1, totalKm: 98.7, streak: 5, rank: 4 },
  { id: "neha", name: "Neha R.", colorIndex: 3, zonesOwned: 1, totalKm: 65.1, streak: 2, rank: 5 },
  { id: "vikram", name: "Vikram P.", colorIndex: 5, zonesOwned: 0, totalKm: 44.2, streak: 1, rank: 6 },
  { id: "ananya", name: "Ananya T.", colorIndex: 1, zonesOwned: 0, totalKm: 38.9, streak: 0, rank: 7 },
];

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [zones, setZones] = useState<Zone[]>(() =>
    MUMBAI_ZONES.map((z) => ({ ...z, id: generateId() }))
  );
  const [friends] = useState<Friend[]>(FRIENDS_DATA);
  const [leaderboard] = useState<LeaderboardEntry[]>(LEADERBOARD_DATA);
  const [locationPermission, setLocationPermission] = useState(false);
  const [tracking, setTracking] = useState<TrackingState>({
    isTracking: false,
    isPaused: false,
    speedKmh: 0,
    currentKm: 0,
    speedWarning: false,
    coords: [],
  });
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const speedWarningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCoord = useRef<ZoneCoord | null>(null);

  const playerStreak = 21;
  const playerTotalKm = 156.8;

  const playerZones = useMemo(
    () => zones.filter((z) => z.ownerId === "player"),
    [zones]
  );

  const activeThreats = useMemo(
    () => zones.filter((z) => z.ownerId === "player" && z.status === "under_attack"),
    [zones]
  );

  useEffect(() => {
    checkLocationPermission();
    startZoneDecay();
  }, []);

  const checkLocationPermission = async () => {
    if (Platform.OS === "web") return;
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationPermission(status === "granted");
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === "web") {
      setLocationPermission(true);
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === "granted");
  };

  const startZoneDecay = () => {
    const interval = setInterval(() => {
      setZones((prev) =>
        prev.map((z) => {
          if (z.ownerId !== "player") return z;
          const decayRate = z.streak >= 30 ? 0.5 : z.streak >= 15 ? 1.0 : z.streak >= 8 ? 1.5 : 2.0;
          const newHealth = Math.max(0, z.health - decayRate * 0.01);
          return { ...z, health: newHealth };
        })
      );
    }, 60000);
    return () => clearInterval(interval);
  };

  function calcDistance(a: ZoneCoord, b: ZoneCoord): number {
    const R = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const sa = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
  }

  const startTracking = useCallback(async () => {
    if (Platform.OS === "web") {
      setTracking((t) => ({ ...t, isTracking: true, isPaused: false, currentKm: 0, coords: [] }));
      return;
    }
    if (!locationPermission) {
      await requestLocationPermission();
      return;
    }
    lastCoord.current = null;
    setTracking((t) => ({ ...t, isTracking: true, isPaused: false, currentKm: 0, coords: [], speedKmh: 0 }));

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 5,
      },
      (location) => {
        const speedMs = location.coords.speed ?? 0;
        const speedKmh = speedMs * 3.6;
        const coord: ZoneCoord = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        const isOverSpeed = speedKmh > 14.5;

        if (isOverSpeed) {
          if (speedWarningTimer.current) clearTimeout(speedWarningTimer.current);
          setTracking((t) => ({ ...t, isPaused: true, speedWarning: true, speedKmh }));
          speedWarningTimer.current = setTimeout(() => {
            setTracking((t) => ({ ...t, speedWarning: false }));
          }, 3000);
          lastCoord.current = null;
          return;
        }

        setTracking((t) => {
          let addedKm = 0;
          if (lastCoord.current && !t.isPaused) {
            addedKm = calcDistance(lastCoord.current, coord);
          }
          lastCoord.current = coord;
          return {
            ...t,
            isPaused: false,
            speedWarning: false,
            speedKmh,
            currentKm: t.currentKm + addedKm,
            coords: [...t.coords, coord],
          };
        });
      }
    );
  }, [locationPermission]);

  const stopTracking = useCallback(() => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    setTracking((t) => ({ ...t, isTracking: false, isPaused: false, speedKmh: 0 }));
  }, []);

  const value = useMemo(
    () => ({
      zones,
      friends,
      leaderboard,
      tracking,
      playerName: "Aakash D.",
      playerColorIndex: 0,
      playerStreak,
      playerTotalKm,
      playerZones,
      activeThreats,
      startTracking,
      stopTracking,
      locationPermission,
      requestLocationPermission,
    }),
    [zones, friends, leaderboard, tracking, playerZones, activeThreats, startTracking, stopTracking, locationPermission]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
