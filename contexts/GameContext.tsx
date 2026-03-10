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
import { Platform, Alert } from "react-native";
import * as Location from "expo-location";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { createRun, uploadRunPoints, stopRun, finalizeRun } from "@/services/runs";

export interface ZoneCoord {
  latitude: number;
  longitude: number;
  timestamp?: number;
  accuracy?: number;
  heading?: number;
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
  runId: string | null;
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
  stopTracking: () => Promise<void>;
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
  const { user } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
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
    runId: null,
  });

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const speedWarningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentSpeeds = useRef<number[]>([]);
  const lastCoord = useRef<ZoneCoord | null>(null);
  const runStartMs = useRef<number>(0);

  // Point Batching Logic
  const pendingPoints = useRef<any[]>([]);
  const batchInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const playerZones = useMemo(() => zones.filter((z) => z.ownerId === user?.id), [zones, user]);
  const activeThreats = useMemo(
    () => zones.filter((z) => z.ownerId === user?.id && z.status === "under_attack"),
    [zones, user]
  );

  useEffect(() => {
    if (user) {
      fetchZones();
      fetchLeaderboard(user.city);
    } else {
      setZones([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("game-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "territories" },
        (payload) => {
          console.log("Territory change received!", payload);
          // In a full implementation, we'd parse the geojson and patch the `zones` array
          fetchZones(); // Quick refresh for now
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "territory_events" },
        (payload) => {
          console.log("War-Room event received!", payload);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const fetchZones = async () => {
    // Stub definition for Phase 5 to map our DB schema to UI Zone
    // In actual implementation, we'd GET the ST_AsGeoJSON(geom)
    // For now we leave zones empty but the realtime is wired!
    setZones([]);
  };

  useEffect(() => {
    if (Platform.OS !== "web") {
      checkLocationPermission();
    }
  }, []);

  const fetchLeaderboard = useCallback(async (city?: string) => {
    // Stubbed until Phase 5
    setLeaderboard([]);
  }, []);

  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === "granted") {
      setLocationPermission(true);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    }
  };

  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === "web") {
      setLocationPermission(true);
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      setLocationPermission(true);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    }
  }, []);

  const flushPoints = async (rId: string, uId: string) => {
    if (pendingPoints.current.length === 0) return;
    const batch = [...pendingPoints.current];
    pendingPoints.current = [];
    try {
      await uploadRunPoints(rId, uId, batch);
    } catch (e) {
      console.error("Failed to upload batch", e);
      // Re-queue points
      pendingPoints.current = [...batch, ...pendingPoints.current];
    }
  };

  const startTracking = useCallback(async () => {
    if (!user) return;
    if (Platform.OS === "web") return;

    if (!locationPermission) {
      await requestLocationPermission();
      return;
    }

    try {
      const runId = await createRun(user.id);

      // Use the last known current location to instantly start the tracker instead of blocking 8 seconds
      let startCoord = currentLocation;
      if (!startCoord) {
        // Fallback to a fast balanced request if completely missing
        const startLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        startCoord = { latitude: startLoc.coords.latitude, longitude: startLoc.coords.longitude };
      }

      setCurrentLocation(startCoord);
      lastCoord.current = startCoord;
      runStartMs.current = Date.now();

      setTracking({
        isTracking: true,
        isPaused: false,
        currentKm: 0,
        coords: [startCoord],
        speedKmh: 0,
        speedWarning: false,
        runId,
      });

      // Start the batch uploader (every 10s)
      batchInterval.current = setInterval(() => {
        if (runId && user.id) flushPoints(runId, user.id);
      }, 10000);

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // every 3 seconds minimum
          distanceInterval: 5, // or 5 meters
        },
        (location) => {
          // Speed calculation & GPS spike smoothing
          const speedMs = location.coords.speed ?? 0;
          const rawSpeedKmh = Math.max(0, speedMs * 3.6);

          // Keep rolling average of last 3 speeds to smooth out GPS glitches
          recentSpeeds.current.push(rawSpeedKmh);
          if (recentSpeeds.current.length > 3) recentSpeeds.current.shift();
          const smoothedSpeed = recentSpeeds.current.reduce((a, b) => a + b, 0) / recentSpeeds.current.length;

          // Flag if consistently running over 20 km/h
          const isOverSpeed = smoothedSpeed > 20.0;
          if (isOverSpeed) {
            if (speedWarningTimer.current) clearTimeout(speedWarningTimer.current);
            setTracking((t) => ({ ...t, isPaused: true, speedWarning: true, speedKmh: smoothedSpeed }));
            speedWarningTimer.current = setTimeout(() => {
              setTracking((t) => ({ ...t, speedWarning: false }));
            }, 6000);
          } else {
            setTracking((t) => ({ ...t, speedKmh: smoothedSpeed }));
          }

          const coord: ZoneCoord = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy || 100,
            heading: location.coords.heading !== null ? location.coords.heading : undefined,
          };

          setCurrentLocation(coord);

          setTracking((t) => {
            let addedKm = 0;
            if (lastCoord.current && !t.isPaused) {
              addedKm = calcDistance(lastCoord.current, coord);
            }
            lastCoord.current = coord;

            const newCoords = [...t.coords, coord];

            // Queue point for Supabase upload
            pendingPoints.current.push({
              coord,
              speedLimit: isOverSpeed,
              accuracy: location.coords.accuracy || 10,
              time: new Date(location.timestamp),
              heading: location.coords.heading,
            });

            return {
              ...t,
              isPaused: false,
              speedWarning: false,
              speedKmh: isOverSpeed ? smoothedSpeed : rawSpeedKmh,
              currentKm: t.currentKm + addedKm,
              coords: newCoords,
            };
          });
        }
      );
    } catch (e) {
      console.error("Failed to start run", e);
      Alert.alert("Error", "Could not create run session.");
    }
  }, [locationPermission, requestLocationPermission, currentLocation, user]);

  const stopTracking = useCallback(async () => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;

    if (speedWarningTimer.current) clearTimeout(speedWarningTimer.current);
    if (batchInterval.current) clearInterval(batchInterval.current);

    setTracking((prev) => {
      const activeRunId = prev.runId;
      const kmRan = prev.currentKm;
      const durationSecs = Math.floor((Date.now() - runStartMs.current) / 1000);

      if (activeRunId && user) {
        // Run Async Cleanup Stack
        (async () => {
          try {
            await flushPoints(activeRunId, user.id);
            await stopRun(activeRunId, kmRan, durationSecs);
            console.log(`Run ${activeRunId} stopped in DB. Triggering territory edge function...`);

            if (kmRan > 0.1) {
              // Only trigger if they actually moved 100m+
              const result = await finalizeRun(activeRunId);
              console.log("Edge Function Capture Result:", result);
            }
          } catch (e) {
            console.error("Failed to complete run cleanly", e);
          }
        })();
      }

      return {
        isTracking: false,
        isPaused: false,
        speedKmh: 0,
        currentKm: 0,
        speedWarning: false,
        coords: [],
        runId: null,
      };
    });
  }, [user]);

  const value = useMemo(
    () => ({
      zones,
      leaderboard,
      tracking,
      currentLocation,
      playerName: user?.name || "Player",
      playerColorIndex: user?.colorIndex || 0,
      playerStreak: user?.streak || 0,
      playerTotalKm: user?.totalKm || 0,
      playerZonesOwned: user?.zonesOwned || 0,
      playerZones,
      activeThreats,
      startTracking,
      stopTracking,
      locationPermission,
      requestLocationPermission,
      fetchLeaderboard,
    }),
    [zones, leaderboard, tracking, currentLocation, user, playerZones, activeThreats, startTracking, stopTracking, locationPermission, requestLocationPermission, fetchLeaderboard]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
