import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useGame, LeaderboardEntry } from "@/contexts/GameContext";
import { Colors, ZoneColors } from "@/constants/colors";

type SortKey = "zones" | "km" | "streak";

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Ionicons name="trophy" size={18} color="#FFD700" />;
  if (rank === 2) return <Ionicons name="trophy" size={18} color="#C0C0C0" />;
  if (rank === 3) return <Ionicons name="trophy" size={18} color="#CD7F32" />;
  return <Text style={styles.rankNum}>{rank}</Text>;
}

function LeaderRow({ entry, sortKey }: { entry: LeaderboardEntry; sortKey: SortKey }) {
  const isPlayer = entry.id === "player";
  const zc = ZoneColors[entry.colorIndex];

  const highlightValue =
    sortKey === "zones"
      ? `${entry.zonesOwned} zones`
      : sortKey === "km"
      ? `${entry.totalKm.toFixed(1)} km`
      : `${entry.streak}d streak`;

  return (
    <View style={[
      styles.rowContainer,
      isPlayer && styles.playerRow,
    ]}>
      {isPlayer && (
        <View style={styles.playerGlow} />
      )}
      <View style={styles.rankCol}>
        <RankMedal rank={entry.rank} />
      </View>

      <View style={[styles.avatar, { backgroundColor: zc.stroke + "20", borderColor: zc.stroke + "50" }]}>
        <Text style={[styles.avatarText, { color: zc.stroke }]}>
          {entry.name.charAt(0)}
        </Text>
      </View>

      <View style={styles.infoCol}>
        <Text style={[styles.entryName, isPlayer && styles.playerName]}>
          {entry.name}
        </Text>
        <View style={styles.miniStats}>
          <View style={styles.miniStat}>
            <Ionicons name="map" size={10} color={Colors.text3} />
            <Text style={styles.miniStatText}>{entry.zonesOwned}</Text>
          </View>
          <View style={styles.miniStat}>
            <Ionicons name="footsteps" size={10} color={Colors.text3} />
            <Text style={styles.miniStatText}>{entry.totalKm.toFixed(0)} km</Text>
          </View>
          <View style={styles.miniStat}>
            <Ionicons name="flame" size={10} color={Colors.text3} />
            <Text style={styles.miniStatText}>{entry.streak}d</Text>
          </View>
        </View>
      </View>

      <View style={[
        styles.highlightBadge,
        {
          backgroundColor:
            sortKey === "zones"
              ? Colors.tealDim
              : sortKey === "km"
              ? "rgba(168,85,247,0.1)"
              : "rgba(255,140,66,0.1)",
        },
      ]}>
        <Text style={[
          styles.highlightValue,
          {
            color:
              sortKey === "zones"
                ? Colors.teal
                : sortKey === "km"
                ? Colors.purple
                : Colors.orange,
          },
        ]}>
          {highlightValue}
        </Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { leaderboard } = useGame();
  const [sortKey, setSortKey] = useState<SortKey>("zones");
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  const sorted = [...leaderboard].sort((a, b) => {
    if (sortKey === "zones") return b.zonesOwned - a.zonesOwned;
    if (sortKey === "km") return b.totalKm - a.totalKm;
    return b.streak - a.streak;
  }).map((e, i) => ({ ...e, rank: i + 1 }));

  const filterOptions: { key: SortKey; label: string; icon: "map" | "footsteps" | "flame" }[] = [
    { key: "zones", label: "Zones", icon: "map" },
    { key: "km", label: "Distance", icon: "footsteps" },
    { key: "streak", label: "Streak", icon: "flame" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenLabel}>MUMBAI</Text>
            <Text style={styles.screenTitle}>City Rankings</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {filterOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterBtn, sortKey === opt.key && styles.filterBtnActive]}
              onPress={() => setSortKey(opt.key)}
            >
              <Ionicons
                name={opt.icon}
                size={13}
                color={sortKey === opt.key ? Colors.bg : Colors.text2}
              />
              <Text style={[styles.filterLabel, sortKey === opt.key && styles.filterLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.podium}>
          {sorted.slice(0, 3).map((entry) => {
            const zc = ZoneColors[entry.colorIndex];
            const heights = [88, 64, 56];
            return (
              <View
                key={entry.id}
                style={[
                  styles.podiumCol,
                  entry.rank === 1 && styles.podiumFirst,
                ]}
              >
                <View style={[styles.podiumAvatar, { backgroundColor: zc.stroke + "20", borderColor: zc.stroke }]}>
                  <Text style={[styles.podiumAvatarText, { color: zc.stroke }]}>
                    {entry.name.charAt(0)}
                  </Text>
                  {entry.rank === 1 && (
                    <View style={styles.crownContainer}>
                      <Ionicons name="trophy" size={14} color="#FFD700" />
                    </View>
                  )}
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{entry.name.split(" ")[0]}</Text>
                <View style={[styles.podiumBlock, { height: heights[entry.rank - 1], backgroundColor: zc.stroke + "20", borderColor: zc.stroke + "40" }]}>
                  <Text style={[styles.podiumRank, { color: zc.stroke }]}>#{entry.rank}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.listSection}>
          <Text style={styles.listSectionTitle}>Full Rankings</Text>
          {sorted.map((entry) => (
            <LeaderRow key={entry.id} entry={entry} sortKey={sortKey} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  screenLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.teal,
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.text },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.redDim,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,61,87,0.25)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.red },
  liveText: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.red, letterSpacing: 1 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  filterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  filterLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.text2 },
  filterLabelActive: { color: Colors.bg },
  podium: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  podiumCol: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    maxWidth: 100,
  },
  podiumFirst: { marginBottom: 16 },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  podiumAvatarText: { fontFamily: "Inter_700Bold", fontSize: 20 },
  crownContainer: {
    position: "absolute",
    top: -14,
  },
  podiumName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.text,
    textAlign: "center",
  },
  podiumBlock: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumRank: { fontFamily: "Inter_700Bold", fontSize: 18 },
  listSection: { marginBottom: 12 },
  listSectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.bg2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  playerRow: {
    borderColor: Colors.teal + "40",
    backgroundColor: Colors.bg3,
  },
  playerGlow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.teal,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  rankCol: { width: 24, alignItems: "center" },
  rankNum: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text2 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  infoCol: { flex: 1, gap: 4 },
  entryName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  playerName: { color: Colors.teal },
  miniStats: { flexDirection: "row", gap: 10 },
  miniStat: { flexDirection: "row", alignItems: "center", gap: 3 },
  miniStatText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.text3 },
  highlightBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  highlightValue: { fontFamily: "Inter_700Bold", fontSize: 12 },
});
