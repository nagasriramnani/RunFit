import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useGame, Zone } from "@/contexts/GameContext";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, ZoneColors } from "@/constants/colors";

function HealthBar({ health, color }: { health: number; color: string }) {
  const pct = Math.max(0, Math.min(100, health));
  const barColor = pct > 60 ? color : pct > 30 ? Colors.orange : Colors.red;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct / 100,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const animWidth = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={hbStyles.track}>
      <Animated.View style={[hbStyles.fill, { width: animWidth as any, backgroundColor: barColor }]} />
    </View>
  );
}

const hbStyles = StyleSheet.create({
  track: {
    height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden", flex: 1,
  },
  fill: { height: "100%", borderRadius: 3 },
});

function StreakBadge({ streak }: { streak: number }) {
  let level = "BRONZE";
  let color = "#CD7F32";
  let count = 1;

  if (streak >= 30) { level = "DIAMOND"; color = "#00E5FF"; count = 5; }
  else if (streak >= 15) { level = "PLATINUM"; color = "#E5E4E2"; count = 4; }
  else if (streak >= 8) { level = "GOLD"; color = "#FFD700"; count = 3; }
  else if (streak >= 4) { level = "SILVER"; color = "#C0C0C0"; count = 2; }

  return (
    <View style={[sbStyles.container, { borderColor: color + "30", backgroundColor: color + "10" }]}>
      <View style={sbStyles.flames}>
        {Array.from({ length: count }).map((_, i) => (
          <Ionicons key={i} name="flame" size={14} color={color} />
        ))}
      </View>
      <Text style={[sbStyles.level, { color }]}>{level}</Text>
    </View>
  );
}

const sbStyles = StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1,
  },
  flames: { flexDirection: "row", gap: 1 },
  level: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.8 },
});

function ThreatCard({ zone }: { zone: Zone }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={tcStyles.container}>
      <View style={tcStyles.leftAccent} />
      <View style={{ flex: 1 }}>
        <View style={tcStyles.headerRow}>
          <View style={tcStyles.nameRow}>
            <Animated.View style={[tcStyles.alertDot, { opacity: pulseAnim }]} />
            <Text style={tcStyles.zoneName}>{zone.name}</Text>
          </View>
          <View style={tcStyles.damageTag}>
            <Text style={tcStyles.damageText}>{zone.attackProgress}% DAMAGE</Text>
          </View>
        </View>
        <Text style={tcStyles.attackerText}>{zone.attackerName} is attacking</Text>
        <View style={tcStyles.healthRow}>
          <HealthBar health={zone.health} color={ZoneColors[zone.colorIndex].stroke} />
          <Text style={[tcStyles.healthPct, {
            color: zone.health > 60 ? Colors.teal : zone.health > 30 ? Colors.orange : Colors.red
          }]}>{Math.round(zone.health)}%</Text>
        </View>
      </View>
    </View>
  );
}

const tcStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg3, borderRadius: 14, padding: 14,
    flexDirection: "row", gap: 12, borderWidth: 1,
    borderColor: "rgba(255,61,87,0.2)", marginBottom: 10,
  },
  leftAccent: { width: 3, borderRadius: 2, backgroundColor: Colors.red, alignSelf: "stretch" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red },
  zoneName: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
  damageTag: { backgroundColor: Colors.redDim, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  damageText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.red, letterSpacing: 0.5 },
  attackerText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text2, marginBottom: 10 },
  healthRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  healthPct: { fontFamily: "Inter_700Bold", fontSize: 12, minWidth: 36, textAlign: "right" },
});

function ZoneRow({ zone }: { zone: Zone }) {
  const zc = ZoneColors[zone.colorIndex];
  return (
    <View style={zrStyles.container}>
      <View style={[zrStyles.colorBar, { backgroundColor: zc.stroke }]} />
      <View style={{ flex: 1 }}>
        <View style={zrStyles.topRow}>
          <Text style={zrStyles.name}>{zone.name}</Text>
          <View style={zrStyles.streakTag}>
            <Ionicons name="flame" size={11} color={Colors.orange} />
            <Text style={zrStyles.streakText}>{zone.streak}d</Text>
          </View>
        </View>
        <View style={zrStyles.healthRow}>
          <HealthBar health={zone.health} color={zc.stroke} />
          <Text style={[zrStyles.healthNum, {
            color: zone.health > 60 ? Colors.teal : zone.health > 30 ? Colors.orange : Colors.red
          }]}>{Math.round(zone.health)}%</Text>
        </View>
      </View>
    </View>
  );
}

const zrStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg3, borderRadius: 12, padding: 14,
    flexDirection: "row", gap: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  colorBar: { width: 3, borderRadius: 2, alignSelf: "stretch" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  streakTag: { flexDirection: "row", alignItems: "center", gap: 3 },
  streakText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.orange },
  healthRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  healthNum: { fontFamily: "Inter_700Bold", fontSize: 12, minWidth: 32, textAlign: "right" },
});

export default function WarRoomScreen() {
  const insets = useSafeAreaInsets();
  const { playerStreak, playerTotalKm, playerZones, activeThreats } = useGame();
  const { user } = useAuth();
  const displayName = user?.name ?? "Runner";
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.screenLabel}>WAR ROOM</Text>
            <Text style={styles.playerName}>{displayName}</Text>
          </View>
          <StreakBadge streak={playerStreak} />
        </View>

        <View style={styles.statsGrid}>
          <LinearGradient colors={[Colors.bg3, Colors.bg2]} style={styles.statCard}>
            <Text style={styles.statValue}>{playerStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
            <Ionicons name="flame" size={20} color={Colors.orange} style={styles.statIcon} />
          </LinearGradient>
          <LinearGradient colors={[Colors.bg3, Colors.bg2]} style={styles.statCard}>
            <Text style={styles.statValue}>{playerTotalKm.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total km</Text>
            <Ionicons name="footsteps" size={20} color={Colors.teal} style={styles.statIcon} />
          </LinearGradient>
          <LinearGradient colors={[Colors.bg3, Colors.bg2]} style={styles.statCard}>
            <Text style={styles.statValue}>{playerZones.length}</Text>
            <Text style={styles.statLabel}>Zones Held</Text>
            <Ionicons name="map" size={20} color={Colors.purple} style={styles.statIcon} />
          </LinearGradient>
        </View>

        {activeThreats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.threatDot} />
              <Text style={styles.sectionTitle}>Active Threats</Text>
              <View style={[styles.countBadge, { backgroundColor: Colors.redDim }]}>
                <Text style={[styles.countText, { color: Colors.red }]}>{activeThreats.length}</Text>
              </View>
            </View>
            {activeThreats.map((z) => <ThreatCard key={z.id} zone={z} />)}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.teal} />
            <Text style={styles.sectionTitle}>My Territories</Text>
            <View style={[styles.countBadge, { backgroundColor: Colors.tealDim }]}>
              <Text style={[styles.countText, { color: Colors.teal }]}>{playerZones.length}</Text>
            </View>
          </View>
          {playerZones.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={32} color={Colors.text3} />
              <Text style={styles.emptyText}>No territories yet. Go for a run to claim zones!</Text>
            </View>
          ) : (
            playerZones.map((z) => <ZoneRow key={z.id} zone={z} />)
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.text2} />
            <Text style={styles.sectionTitle}>Zone Rules</Text>
          </View>
          <View style={styles.infoCard}>
            {[
              { bg: Colors.tealDim, icon: "timer-outline" as const, iconColor: Colors.teal, text: "Zones lose 2% health every 24h without running" },
              { bg: "rgba(255,140,66,0.12)", icon: "flame" as const, iconColor: Colors.orange, text: "7+ day streak reduces decay to 1.5%/day" },
              { bg: "rgba(168,85,247,0.12)", icon: "trophy" as const, iconColor: Colors.purple, text: "30+ day streak: only 0.25% decay per day" },
              { bg: "rgba(255,61,87,0.12)", icon: "speedometer" as const, iconColor: Colors.red, text: "Speed cap: 14 km/h — no cycling or vehicles" },
            ].map((item) => (
              <View key={item.text} style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={14} color={item.iconColor} />
                </View>
                <Text style={styles.infoText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20 },
  titleRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 24,
  },
  screenLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.teal,
    letterSpacing: 2.5, marginBottom: 4,
  },
  playerName: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.text },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text, marginBottom: 2 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.text2 },
  statIcon: { position: "absolute", right: 12, top: 12, opacity: 0.5 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, flex: 1 },
  threatDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  countText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  emptyState: {
    alignItems: "center", gap: 8, padding: 24,
    backgroundColor: Colors.bg2, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text2, textAlign: "center" },
  infoCard: {
    backgroundColor: Colors.bg2, borderRadius: 14, padding: 16,
    gap: 12, borderWidth: 1, borderColor: Colors.border,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text2, flex: 1 },
});
