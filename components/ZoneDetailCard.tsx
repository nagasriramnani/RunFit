import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Zone } from "@/contexts/GameContext";
import { Colors, ZoneColors } from "@/constants/colors";

function HealthBar({ health, color }: { health: number; color: string }) {
  const pct = Math.max(0, Math.min(100, health));
  const barColor = pct > 60 ? color : pct > 30 ? Colors.orange : Colors.red;
  return (
    <View style={hbStyles.container}>
      <View style={[hbStyles.fill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
    </View>
  );
}

const hbStyles = StyleSheet.create({
  container: {
    height: 5, borderRadius: 2.5, backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden", flex: 1,
  },
  fill: { height: "100%", borderRadius: 2.5 },
});

interface Props {
  zone: Zone;
  onClose: () => void;
}

export default function ZoneDetailCard({ zone, onClose }: Props) {
  const zc = ZoneColors[zone.colorIndex];
  const statusColor =
    zone.status === "under_attack"
      ? Colors.red
      : zone.status === "contested"
      ? Colors.orange
      : Colors.teal;
  const statusLabel =
    zone.status === "under_attack"
      ? "UNDER ATTACK"
      : zone.status === "contested"
      ? "CONTESTED"
      : "DEFENDED";

  return (
    <View style={styles.container}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={[styles.colorDot, { backgroundColor: zc.stroke }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.zoneName}>{zone.name}</Text>
          <Text style={styles.ownerText}>
            {zone.ownerId === "player" ? "Your Territory" : `Owned by ${zone.ownerName}`}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={Colors.text2} />
        </TouchableOpacity>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: statusColor + "20", borderColor: statusColor + "40" }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(zone.health)}%</Text>
          <Text style={styles.statLabel}>Health</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{zone.streak}d</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{zone.kmRun.toFixed(1)}</Text>
          <Text style={styles.statLabel}>km run</Text>
        </View>
      </View>

      <View style={styles.healthRow}>
        <Text style={styles.healthLabel}>Zone Health</Text>
        <Text style={[styles.healthPct, {
          color: zone.health > 60 ? Colors.teal : zone.health > 30 ? Colors.orange : Colors.red
        }]}>{Math.round(zone.health)}%</Text>
      </View>
      <HealthBar health={zone.health} color={zc.stroke} />

      {zone.status === "under_attack" && zone.attackerName && (
        <View style={styles.attackAlert}>
          <Ionicons name="warning" size={14} color={Colors.red} />
          <Text style={styles.attackText}>
            {zone.attackerName} — {zone.attackProgress}% damage dealt
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingTop: 12, borderTopWidth: 1, borderColor: Colors.border,
  },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2,
    alignSelf: "center", marginBottom: 16,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  zoneName: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  ownerText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text2, marginTop: 1 },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
    alignSelf: "flex-start", marginBottom: 16,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.8 },
  statsRow: {
    flexDirection: "row", backgroundColor: Colors.bg3, borderRadius: 12,
    padding: 16, marginBottom: 16,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text2, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  healthRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  healthLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text2 },
  healthPct: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  attackAlert: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12,
    backgroundColor: Colors.redDim, padding: 10, borderRadius: 8,
  },
  attackText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.red, flex: 1 },
});
