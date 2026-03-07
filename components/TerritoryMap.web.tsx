import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useGame, Zone } from "@/contexts/GameContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGang } from "@/contexts/GangContext";
import { Colors, ZoneColors } from "@/constants/colors";
import ZoneDetailCard from "@/components/ZoneDetailCard";
import InvitePanel from "@/components/InvitePanel";

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

function GangMemberBubble({ name, colorIndex, isYou }: {
  name: string; colorIndex: number; isYou?: boolean;
}) {
  const zc = ZoneColors[colorIndex];
  return (
    <View style={gmStyles.wrap}>
      <View style={[gmStyles.avatar, {
        backgroundColor: zc.stroke + "20",
        borderColor: zc.stroke + (isYou ? "90" : "40"),
        ...(isYou ? { shadowColor: zc.stroke, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 } : {}),
      }]}>
        <Text style={[gmStyles.letter, { color: zc.stroke }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={[gmStyles.label, isYou && { color: Colors.teal }]} numberOfLines={1}>
        {isYou ? "You" : name.split(" ")[0]}
      </Text>
    </View>
  );
}

const gmStyles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 4, minWidth: 44 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", borderWidth: 2,
  },
  letter: { fontFamily: "Inter_700Bold", fontSize: 14 },
  label: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.text2 },
});

export default function TerritoryMap() {
  const insets = useSafeAreaInsets();
  const { zones } = useGame();
  const { user, signOut } = useAuth();
  const { gangMembers } = useGang();
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const playerColor = user ? ZoneColors[user.colorIndex].stroke : Colors.teal;
  const topPad = insets.top + 67;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.gangStrip}>
        <LinearGradient
          colors={["rgba(10,10,15,0.9)", "rgba(19,19,26,0.85)"]}
          style={StyleSheet.absoluteFill}
        />
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setMenuOpen((v) => !v)}
        >
          <View style={styles.menuIconWrap}>
            <View style={[styles.menuLine, { width: 18 }]} />
            <View style={[styles.menuLine, { width: 14 }]} />
            <View style={[styles.menuLine, { width: 18 }]} />
          </View>
          {gangMembers.length > 0 && (
            <View style={styles.menuBadge}>
              <Text style={styles.menuBadgeText}>{gangMembers.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.stripSep} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripScroll}
          style={{ flex: 1 }}
        >
          {user && <GangMemberBubble name={user.name} colorIndex={user.colorIndex} isYou />}
          {gangMembers.map((m) => (
            <GangMemberBubble key={m.id} name={m.name} colorIndex={m.colorIndex} />
          ))}
          {gangMembers.length === 0 && (
            <TouchableOpacity
              style={styles.inviteChip}
              onPress={() => setInviteOpen(true)}
            >
              <Ionicons name="person-add" size={13} color={Colors.teal} />
              <Text style={styles.inviteChipText}>Invite friends</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setInviteOpen(true)}
        >
          <Ionicons name="person-add" size={16} color={Colors.teal} />
        </TouchableOpacity>
      </View>

      {menuOpen && (
        <View style={styles.menuDropdown}>
          <LinearGradient colors={[Colors.bg2, Colors.bg3]} style={StyleSheet.absoluteFill} />
          <View style={styles.menuDropUser}>
            <View style={[styles.menuAvatar, { backgroundColor: playerColor + "20", borderColor: playerColor + "50" }]}>
              <Text style={[styles.menuAvatarLetter, { color: playerColor }]}>
                {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View>
              <Text style={styles.menuUserName}>{user?.name}</Text>
              <Text style={styles.menuUserCity}>{user?.city}</Text>
            </View>
          </View>
          <View style={styles.menuSep} />
          <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuOpen(false); setInviteOpen(true); }}>
            <View style={[styles.menuRowIcon, { backgroundColor: Colors.tealDim }]}>
              <Ionicons name="person-add" size={14} color={Colors.teal} />
            </View>
            <Text style={styles.menuRowText}>Add Gang Member</Text>
          </TouchableOpacity>
          <View style={styles.menuSep} />
          <TouchableOpacity style={styles.menuRow} onPress={() => { setMenuOpen(false); signOut(); }}>
            <View style={[styles.menuRowIcon, { backgroundColor: Colors.redDim }]}>
              <Ionicons name="log-out-outline" size={14} color={Colors.red} />
            </View>
            <Text style={[styles.menuRowText, { color: Colors.red }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      <InvitePanel
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        topOffset={68 + 8}
      />

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
            Scan the QR code in Expo Go for interactive GPS tracking and territory claiming
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
                    color: zone.health > 60 ? Colors.teal : zone.health > 30 ? Colors.orange : Colors.red,
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
  gangStrip: {
    marginHorizontal: 12, height: 64, borderRadius: 16,
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
    marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  menuBtn: {
    width: 50, alignItems: "center", justifyContent: "center",
    height: "100%", position: "relative",
  },
  menuIconWrap: { gap: 4, alignItems: "flex-start" },
  menuLine: { height: 2, backgroundColor: Colors.text, borderRadius: 1 },
  menuBadge: {
    position: "absolute", top: 8, right: 6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.teal, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  menuBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#000" },
  stripSep: { width: 1, height: 32, backgroundColor: Colors.border },
  stripScroll: { paddingHorizontal: 10, gap: 10, alignItems: "center" },
  inviteChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.tealDim, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.teal + "30",
  },
  inviteChipText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.teal },
  addBtn: {
    width: 42, height: "100%", alignItems: "center", justifyContent: "center",
    borderLeftWidth: 1, borderLeftColor: Colors.border,
  },
  menuDropdown: {
    marginHorizontal: 12, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    overflow: "hidden", marginBottom: 8, zIndex: 20,
  },
  menuDropUser: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  menuAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5,
  },
  menuAvatarLetter: { fontFamily: "Inter_700Bold", fontSize: 15 },
  menuUserName: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.text },
  menuUserCity: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text2 },
  menuSep: { height: 1, backgroundColor: Colors.border },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  menuRowIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  menuRowText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  mapPlaceholder: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden", height: 150,
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
