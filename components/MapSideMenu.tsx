import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useGang, GangMember } from "@/contexts/GangContext";
import { Colors, ZoneColors } from "@/constants/colors";

const MENU_WIDTH = Math.min(Dimensions.get("window").width * 0.82, 320);

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddFriend: () => void;
}

function MemberRow({ member, onRemove }: { member: GangMember; onRemove: () => void }) {
  const zc = ZoneColors[member.colorIndex];
  return (
    <View style={rowStyles.container}>
      <View style={[rowStyles.avatar, { backgroundColor: zc.stroke + "18", borderColor: zc.stroke + "40" }]}>
        <Text style={[rowStyles.avatarLetter, { color: zc.stroke }]}>
          {member.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={rowStyles.name}>{member.name}</Text>
        <View style={rowStyles.statsRow}>
          <Ionicons name="map" size={10} color={Colors.text3} />
          <Text style={rowStyles.stat}>{member.zonesOwned} zones</Text>
          <Ionicons name="footsteps" size={10} color={Colors.text3} />
          <Text style={rowStyles.stat}>{member.totalKm.toFixed(0)} km</Text>
          <Ionicons name="flame" size={10} color={Colors.orange} />
          <Text style={rowStyles.stat}>{member.streak}d</Text>
        </View>
      </View>
      <TouchableOpacity
        style={rowStyles.removeBtn}
        onPress={() => {
          Alert.alert("Remove", `Remove ${member.name} from your gang?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: onRemove },
          ]);
        }}
      >
        <Ionicons name="close" size={14} color={Colors.text3} />
      </TouchableOpacity>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  avatarLetter: { fontFamily: "Inter_700Bold", fontSize: 15 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  stat: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.text2 },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.bg3, alignItems: "center", justifyContent: "center",
  },
});

export default function MapSideMenu({ visible, onClose, onAddFriend }: Props) {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { gangMembers, removeMember } = useGang();
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 220,
          friction: 22,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -MENU_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const playerColor = user ? ZoneColors[user.colorIndex].stroke : Colors.teal;
  const colorName = user ? ["Teal", "Purple", "Orange", "Red", "Blue", "Green"][user.colorIndex] : "Teal";

  if (!visible && slideAnim.__getValue() === -MENU_WIDTH) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? "auto" : "none"}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onClose();
        }}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.55)", opacity: backdropAnim },
          ]}
        />
      </Pressable>

      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideAnim }], paddingTop: insets.top },
        ]}
      >
        <LinearGradient
          colors={[Colors.bg2, Colors.bg]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.profileSection}>
          <LinearGradient
            colors={[playerColor + "30", playerColor + "08"]}
            style={styles.avatarGrad}
          >
            <Text style={[styles.avatarLetter, { color: playerColor }]}>
              {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name ?? "Runner"}</Text>
            <View style={styles.userMeta}>
              <View style={[styles.colorDot, { backgroundColor: playerColor }]} />
              <Text style={[styles.colorName, { color: playerColor }]}>{colorName}</Text>
              <Text style={styles.bullet}>·</Text>
              <Ionicons name="location" size={11} color={Colors.text3} />
              <Text style={styles.city}>{user?.city ?? "Mumbai"}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={Colors.text2} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.gangHeader}>
          <View style={styles.gangTitleRow}>
            <View style={styles.gangIconWrap}>
              <Ionicons name="people" size={16} color={Colors.teal} />
            </View>
            <Text style={styles.gangTitle}>My Gang</Text>
            {gangMembers.length > 0 && (
              <View style={styles.memberCountBadge}>
                <Text style={styles.memberCountText}>{gangMembers.length}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.addFriendBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onClose();
              setTimeout(onAddFriend, 250);
            }}
          >
            <LinearGradient
              colors={[Colors.teal + "20", Colors.teal + "08"]}
              style={styles.addFriendGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="person-add" size={16} color={Colors.teal} />
              <Text style={styles.addFriendText}>Add Gang Member</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.membersList}
        >
          {gangMembers.length === 0 ? (
            <View style={styles.emptyGang}>
              <Ionicons name="people-outline" size={36} color={Colors.text3} />
              <Text style={styles.emptyTitle}>No gang yet</Text>
              <Text style={styles.emptyDesc}>
                Invite your friends to run together and take over the city
              </Text>
            </View>
          ) : (
            gangMembers.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                onRemove={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  removeMember(m.id);
                }}
              />
            ))
          )}
        </ScrollView>

        <View style={[styles.bottomSection, { paddingBottom: (insets.bottom || 20) + 8 }]}>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.signOutRow}
            onPress={() => {
              Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Sign Out",
                  style: "destructive",
                  onPress: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    onClose();
                    setTimeout(signOut, 300);
                  },
                },
              ]);
            }}
          >
            <View style={styles.signOutIcon}>
              <Ionicons name="log-out-outline" size={18} color={Colors.red} />
            </View>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    top: 0, bottom: 0, left: 0,
    width: MENU_WIDTH,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    overflow: "hidden",
  },
  profileSection: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 18, paddingVertical: 16,
  },
  avatarGrad: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
  },
  avatarLetter: { fontFamily: "Inter_700Bold", fontSize: 22 },
  userName: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginBottom: 3 },
  userMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  colorDot: { width: 7, height: 7, borderRadius: 3.5 },
  colorName: { fontFamily: "Inter_500Medium", fontSize: 11 },
  bullet: { color: Colors.text3, fontSize: 11 },
  city: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.text2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bg3, alignItems: "center", justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 0 },
  gangHeader: { padding: 16, gap: 10 },
  gangTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  gangIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.tealDim, alignItems: "center", justifyContent: "center",
  },
  gangTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, flex: 1 },
  memberCountBadge: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: Colors.teal,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  memberCountText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#000" },
  addFriendBtn: { borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: Colors.teal + "30" },
  addFriendGrad: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  addFriendText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.teal },
  membersList: { paddingBottom: 8 },
  emptyGang: {
    alignItems: "center", padding: 32, gap: 8,
  },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text2 },
  emptyDesc: {
    fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text3,
    textAlign: "center", lineHeight: 18,
  },
  bottomSection: { paddingHorizontal: 0 },
  signOutRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  signOutIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.redDim, alignItems: "center", justifyContent: "center",
  },
  signOutText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.red },
});
