import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ExpoClipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGang, GangMember } from "@/contexts/GangContext";
import { Colors, ZoneColors } from "@/constants/colors";

function StreakIcon({ streak }: { streak: number }) {
  if (streak >= 30) return <Ionicons name="diamond" size={16} color="#00E5FF" />;
  if (streak >= 15) return <Ionicons name="ribbon" size={16} color="#E5E4E2" />;
  if (streak >= 8) return <Ionicons name="flame" size={16} color="#FFD700" />;
  if (streak >= 4) return <Ionicons name="flame" size={16} color="#C0C0C0" />;
  return <Ionicons name="flame" size={16} color="#CD7F32" />;
}

function RivalCard({ member }: { member: GangMember }) {
  const zc = ZoneColors[member.colorIndex];

  return (
    <View style={fcStyles.container}>
      <View style={[fcStyles.avatar, { backgroundColor: zc.stroke + "15", borderColor: zc.stroke + "40" }]}>
        {member.profilePicture ? (
          <Image source={{ uri: member.profilePicture }} style={fcStyles.avatarImg} />
        ) : (
          <Text style={[fcStyles.avatarText, { color: zc.stroke }]}>{member.name.charAt(0)}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={fcStyles.name}>{member.name}</Text>
        <View style={fcStyles.statsRow}>
          <View style={fcStyles.stat}>
            <Ionicons name="map" size={11} color={Colors.text3} />
            <Text style={fcStyles.statText}>{member.zonesOwned} zones</Text>
          </View>
          <View style={fcStyles.stat}>
            <Ionicons name="footsteps" size={11} color={Colors.text3} />
            <Text style={fcStyles.statText}>{member.totalKm.toFixed(1)} km</Text>
          </View>
          <View style={fcStyles.stat}>
            <StreakIcon streak={member.streak} />
            <Text style={fcStyles.statText}>{member.streak}d</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const fcStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg2, borderRadius: 14, padding: 14,
    flexDirection: "row", gap: 12, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center", borderWidth: 1, overflow: "hidden",
  },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 18 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 4 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 2 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.text2 },
});

function PlayerHeader() {
  const { playerStreak, playerTotalKm, playerZonesOwned } = useGame();
  const { user } = useAuth();
  const { serverUserId, apiUrl } = useGang();
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const colorIndex = user?.colorIndex ?? 0;
  const zc = ZoneColors[colorIndex];
  const displayName = user?.name ?? "Runner";
  const city = user?.city ?? "Mumbai";

  React.useEffect(() => {
    if (serverUserId) {
      fetch(apiUrl("/api/users/me"), {
        headers: { "x-user-id": serverUserId },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.profilePicture) setProfilePic(data.profilePicture);
        })
        .catch(() => {});
    }
  }, [serverUserId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setProfilePic(uri);

      if (serverUserId) {
        fetch(apiUrl("/api/users/profile-picture"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": serverUserId,
          },
          body: JSON.stringify({ profilePicture: uri }),
        }).catch(console.error);
      }
    }
  };

  return (
    <LinearGradient colors={[Colors.bg3, Colors.bg2]} style={phStyles.container}>
      <TouchableOpacity onPress={pickImage} style={phStyles.avatarWrap} activeOpacity={0.7}>
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={phStyles.avatarGrad} />
        ) : (
          <LinearGradient
            colors={[zc.stroke + "50", zc.stroke + "15"]}
            style={phStyles.avatarGrad}
          >
            <Text style={[phStyles.avatarText, { color: zc.stroke }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}
        <View style={phStyles.cameraIcon}>
          <Ionicons name="camera" size={12} color={Colors.text} />
        </View>
      </TouchableOpacity>

      <View style={phStyles.info}>
        <Text style={phStyles.name}>{displayName}</Text>
        {user?.email && <Text style={phStyles.email}>{user.email}</Text>}
        <View style={phStyles.badgeRow}>
          <View style={[phStyles.badge, { backgroundColor: Colors.tealDim }]}>
            <Ionicons name="location" size={11} color={Colors.teal} />
            <Text style={[phStyles.badgeText, { color: Colors.teal }]}>{city}</Text>
          </View>
          {playerStreak > 0 && (
            <View style={[phStyles.badge, { backgroundColor: "rgba(255,140,66,0.12)" }]}>
              <Ionicons name="flame" size={11} color={Colors.orange} />
              <Text style={[phStyles.badgeText, { color: Colors.orange }]}>{playerStreak} day streak</Text>
            </View>
          )}
          <View style={[phStyles.badge, { backgroundColor: zc.stroke + "15" }]}>
            <View style={[phStyles.colorDot, { backgroundColor: zc.stroke }]} />
            <Text style={[phStyles.badgeText, { color: zc.stroke }]}>
              {["Teal", "Purple", "Orange", "Red", "Blue", "Green"][colorIndex]}
            </Text>
          </View>
        </View>
      </View>

      <View style={phStyles.statsGrid}>
        <View style={phStyles.statItem}>
          <Text style={phStyles.statValue}>{playerTotalKm.toFixed(1)}</Text>
          <Text style={phStyles.statLabel}>km run</Text>
        </View>
        <View style={phStyles.statDivider} />
        <View style={phStyles.statItem}>
          <Text style={phStyles.statValue}>{playerZonesOwned}</Text>
          <Text style={phStyles.statLabel}>territories</Text>
        </View>
        <View style={phStyles.statDivider} />
        <View style={phStyles.statItem}>
          <Text style={phStyles.statValue}>{playerStreak}</Text>
          <Text style={phStyles.statLabel}>day streak</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const phStyles = StyleSheet.create({
  container: {
    borderRadius: 20, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  avatarWrap: { position: "relative", alignSelf: "flex-start", marginBottom: 14 },
  avatarGrad: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 28 },
  cameraIcon: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.bg3, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.bg2,
  },
  info: { marginBottom: 18 },
  name: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text, marginBottom: 2 },
  email: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text2, marginBottom: 8 },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  badgeText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  colorDot: { width: 7, height: 7, borderRadius: 3.5 },
  statsGrid: {
    flexDirection: "row", backgroundColor: Colors.bg, borderRadius: 12, padding: 14,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.text2, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border },
});

function InviteCodeCard() {
  const { myInviteCode } = useGang();
  const [copied, setCopied] = React.useState(false);

  if (!myInviteCode) return null;

  const handleCopy = async () => {
    await ExpoClipboard.setStringAsync(myInviteCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={icStyles.container}>
      <View style={icStyles.header}>
        <Ionicons name="key" size={14} color={Colors.teal} />
        <Text style={icStyles.label}>MY INVITE CODE</Text>
      </View>
      <View style={icStyles.codeRow}>
        <Text style={icStyles.code}>{myInviteCode}</Text>
        <TouchableOpacity style={icStyles.copyBtn} onPress={handleCopy}>
          <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={copied ? Colors.teal : Colors.text2} />
        </TouchableOpacity>
      </View>
      <Text style={icStyles.hint}>Share this code so friends can add you</Text>
    </View>
  );
}

const icStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg2, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.teal + "30", marginBottom: 16, gap: 8,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.teal, letterSpacing: 1.5 },
  codeRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.bg3, borderRadius: 10, paddingLeft: 14, paddingRight: 6, paddingVertical: 10,
  },
  code: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, letterSpacing: 1 },
  copyBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: Colors.bg2, alignItems: "center", justifyContent: "center",
  },
  hint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text3 },
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { gangMembers } = useGang();
  const { signOut } = useAuth();
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of DAUDLO?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            signOut();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.screenLabel}>PROFILE</Text>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={Colors.text2} />
          </TouchableOpacity>
        </View>

        <PlayerHeader />

        <InviteCodeCard />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={16} color={Colors.teal} />
            <Text style={styles.sectionTitle}>Rivals</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{gangMembers.length}</Text>
            </View>
          </View>
          <Text style={styles.sectionSub}>Your connected running rivals</Text>
          {gangMembers.length === 0 ? (
            <View style={styles.emptyRivals}>
              <Ionicons name="people-outline" size={28} color={Colors.text3} />
              <Text style={styles.emptyText}>No rivals yet. Share your invite code to add friends!</Text>
            </View>
          ) : (
            gangMembers.map((m) => <RivalCard key={m.id} member={m} />)
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={16} color={Colors.purple} />
            <Text style={styles.sectionTitle}>Streak Tiers</Text>
          </View>
          <View style={styles.tiersCard}>
            {[
              { icon: "flame" as const, color: "#CD7F32", label: "Bronze", range: "1–3 days", decay: "−2%/day" },
              { icon: "flame" as const, color: "#C0C0C0", label: "Silver", range: "4–7 days", decay: "−1.5%/day" },
              { icon: "flame" as const, color: "#FFD700", label: "Gold", range: "8–14 days", decay: "−1%/day" },
              { icon: "ribbon" as const, color: "#E5E4E2", label: "Platinum", range: "15–30 days", decay: "−0.5%/day" },
              { icon: "diamond" as const, color: "#00E5FF", label: "Diamond", range: "30+ days", decay: "−0.25%/day" },
            ].map((tier) => (
              <View key={tier.label} style={styles.tierRow}>
                <Ionicons name={tier.icon} size={16} color={tier.color} />
                <View style={[styles.tierColorLine, { backgroundColor: tier.color + "25" }]}>
                  <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label}</Text>
                </View>
                <Text style={styles.tierRange}>{tier.range}</Text>
                <Text style={[styles.tierDecay, {
                  color: tier.decay.includes("0.25") || tier.decay.includes("0.5") ? Colors.teal : Colors.text2
                }]}>{tier.decay}</Text>
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
  headerRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 16,
  },
  screenLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.teal, letterSpacing: 2.5,
  },
  signOutBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.bg2, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
  },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, flex: 1 },
  sectionSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text2, marginBottom: 14 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: Colors.tealDim },
  countText: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.teal },
  emptyRivals: {
    alignItems: "center", gap: 8, padding: 24,
    backgroundColor: Colors.bg2, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text2, textAlign: "center" },
  tiersCard: {
    backgroundColor: Colors.bg2, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  tierRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 11, paddingHorizontal: 12,
  },
  tierColorLine: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, minWidth: 70 },
  tierLabel: { fontFamily: "Inter_700Bold", fontSize: 12 },
  tierRange: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text2, flex: 1 },
  tierDecay: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
