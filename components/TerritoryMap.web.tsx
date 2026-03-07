import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useGame, Zone } from "@/contexts/GameContext";
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
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 67 }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>DAUDLO</Text>
        <Text style={styles.subtitle}>Territory Running Game</Text>
      </View>
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={52} color={Colors.teal} style={{ opacity: 0.5 }} />
        <Text style={styles.placeholderTitle}>Live GPS Map</Text>
        <Text style={styles.placeholderText}>
          Open on your phone via Expo Go to see the interactive territory map with real-time GPS tracking
        </Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 34 + 84 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Active Zones · Mumbai</Text>
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
                <Text style={styles.zoneOwner}>{zone.ownerName}</Text>
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
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  logo: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.teal, letterSpacing: 4 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text2, marginTop: 2 },
  mapPlaceholder: {
    marginHorizontal: 20, marginBottom: 20, backgroundColor: Colors.bg2,
    borderRadius: 16, padding: 28, alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  placeholderTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 4 },
  placeholderText: {
    fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text2,
    textAlign: "center", lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.text, marginBottom: 12,
  },
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
