import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useGame, Zone } from "@/contexts/GameContext";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, ZoneColors } from "@/constants/colors";
import ZoneDetailCard from "@/components/ZoneDetailCard";

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
    height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden", flex: 1,
  },
  fill: { height: "100%", borderRadius: 2 },
});

export default function TerritoryMap() {
  const insets = useSafeAreaInsets();
  const { zones } = useGame();
  const { user } = useAuth();
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const playerColor = user ? ZoneColors[user.colorIndex].stroke : Colors.teal;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 67 }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>DAUDLO</Text>
          {user && (
            <View style={styles.cityBadge}>
              <Ionicons name="location" size={11} color={playerColor} />
              <Text style={[styles.cityText, { color: playerColor }]}>{user.city}</Text>
            </View>
          )}
        </View>
        {user && (
          <View style={[styles.playerDot, { backgroundColor: playerColor + "20", borderColor: playerColor + "60" }]}>
            <Text style={[styles.playerLetter, { color: playerColor }]}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.mapPlaceholder}>
        <View style={styles.mapGrid}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.mapGridLine, { top: `${(i + 1) * 14}%` as any }]} />
          ))}
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.mapGridLineV, { left: `${(i + 1) * 14}%` as any }]} />
          ))}
          <Ionicons name="map-outline" size={48} color={Colors.teal} style={{ opacity: 0.3 }} />
          <Text style={styles.placeholderTitle}>Live GPS Map</Text>
          <Text style={styles.placeholderText}>
            Scan the QR code in Expo Go to use the interactive map with GPS tracking, territory claiming, and worldwide coverage
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 34 + 84 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Active Zones</Text>
        {zones.map((zone) => {
          const zc = ZoneColors[zone.colorIndex];
          return (
            <TouchableOpacity
              key={zone.id}
              style={[styles.zoneCard, { borderLeftColor: zc.stroke }]}
              onPress={() => setSelectedZone(zone)}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.zoneTopRow}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  {zone.status === "under_attack" && (
                    <View style={styles.attackTag}>
                      <Text style={styles.attackTagText}>UNDER ATTACK</Text>
                    </View>
                  )}
                  {zone.status === "contested" && (
                    <View style={[styles.attackTag, { backgroundColor: "rgba(255,140,66,0.15)" }]}>
                      <Text style={[styles.attackTagText, { color: Colors.orange }]}>CONTESTED</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.zoneOwner, zone.ownerId === "player" && { color: playerColor }]}>
                  {zone.ownerId === "player" ? (user?.name ?? "You") : zone.ownerName}
                </Text>
                <View style={styles.zoneHealthRow}>
                  <HealthBar health={zone.health} color={zc.stroke} />
                  <Text style={[styles.zoneHealthNum, {
                    color: zone.health > 60 ? Colors.teal : zone.health > 30 ? Colors.orange : Colors.red
                  }]}>{Math.round(zone.health)}%</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.text3} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedZone && (
        <ZoneDetailCard zone={selectedZone} onClose={() => setSelectedZone(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  headerLeft: { gap: 4 },
  logo: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.teal, letterSpacing: 4 },
  cityBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
  },
  cityText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  playerDot: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5,
  },
  playerLetter: { fontFamily: "Inter_700Bold", fontSize: 16 },
  mapPlaceholder: {
    marginHorizontal: 20, marginBottom: 20, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
    height: 160,
  },
  mapGrid: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.bg2, gap: 8, padding: 20,
  },
  mapGridLine: {
    position: "absolute", left: 0, right: 0,
    height: 1, backgroundColor: Colors.border,
  },
  mapGridLineV: {
    position: "absolute", top: 0, bottom: 0,
    width: 1, backgroundColor: Colors.border,
  },
  placeholderTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  placeholderText: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text2,
    textAlign: "center", lineHeight: 18,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.text, marginBottom: 12 },
  zoneCard: {
    backgroundColor: Colors.bg2, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 3, flexDirection: "row", alignItems: "center", gap: 12,
  },
  zoneTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  zoneName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, flex: 1 },
  attackTag: {
    backgroundColor: Colors.redDim, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5,
  },
  attackTagText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.red, letterSpacing: 0.5 },
  zoneOwner: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text2, marginBottom: 8 },
  zoneHealthRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  zoneHealthNum: { fontFamily: "Inter_700Bold", fontSize: 13, minWidth: 36, textAlign: "right" },
});
