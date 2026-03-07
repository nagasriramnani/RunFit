import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGang } from "@/contexts/GangContext";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, ZoneColors } from "@/constants/colors";

interface Props {
  onOpenMenu: () => void;
  topOffset: number;
}

function MemberBubble({
  name,
  colorIndex,
  isYou,
  isActive,
  isRunning,
  delay,
}: {
  name: string;
  colorIndex: number;
  isYou?: boolean;
  isActive?: boolean;
  isRunning?: boolean;
  delay: number;
}) {
  const zc = ZoneColors[colorIndex];
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const runPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 16,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (isRunning) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(runPulse, { toValue: 0.6, duration: 500, useNativeDriver: true }),
          Animated.timing(runPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [isRunning]);

  const statusColor = isRunning ? Colors.teal : isActive ? "#4ADE80" : undefined;

  return (
    <Animated.View style={[bubbleStyles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Animated.View
        style={[
          bubbleStyles.avatar,
          {
            backgroundColor: zc.stroke + "20",
            borderColor: zc.stroke + (isYou ? "90" : "40"),
            ...(isRunning ? { opacity: runPulse } : {}),
          },
          isYou && bubbleStyles.youAvatar,
        ]}
      >
        <Text style={[bubbleStyles.letter, { color: zc.stroke }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
        {(isYou || statusColor) && (
          <View style={[
            bubbleStyles.statusDot,
            { backgroundColor: isYou ? Colors.teal : statusColor },
          ]} />
        )}
      </Animated.View>
      <Text style={[bubbleStyles.label, isYou && { color: Colors.teal }]} numberOfLines={1}>
        {isYou ? "You" : name.split(" ")[0]}
      </Text>
    </Animated.View>
  );
}

const bubbleStyles = StyleSheet.create({
  container: { alignItems: "center", gap: 4, width: 48 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, position: "relative",
  },
  youAvatar: {
    shadowColor: Colors.teal, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
  },
  letter: { fontFamily: "Inter_700Bold", fontSize: 15 },
  statusDot: {
    position: "absolute", bottom: -1, right: -1,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: Colors.bg2,
  },
  label: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.text2, textAlign: "center" },
});

export default function GangMembersStrip({ onOpenMenu, topOffset }: Props) {
  const { gangMembers } = useGang();
  const { user } = useAuth();
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const activeCount = gangMembers.filter((m) => m.isActive).length;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0, tension: 160, friction: 18, delay: 300, useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1, duration: 400, delay: 300, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        { top: topOffset, opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <LinearGradient
        colors={["rgba(10,10,15,0.88)", "rgba(19,19,26,0.82)"]}
        style={StyleSheet.absoluteFill}
      />

      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onOpenMenu();
        }}
        activeOpacity={0.7}
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

      <View style={styles.separator} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ flex: 1 }}
      >
        {user && (
          <MemberBubble
            name={user.name}
            colorIndex={user.colorIndex}
            isYou
            delay={0}
          />
        )}
        {gangMembers.map((m, i) => (
          <MemberBubble
            key={m.id}
            name={m.name}
            colorIndex={m.colorIndex}
            isActive={m.isActive}
            isRunning={m.isRunning}
            delay={(i + 1) * 60}
          />
        ))}
        {gangMembers.length === 0 && (
          <TouchableOpacity
            style={styles.invitePrompt}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenMenu();
            }}
          >
            <View style={styles.inviteIconWrap}>
              <Ionicons name="person-add" size={14} color={Colors.teal} />
            </View>
            <Text style={styles.invitePromptText}>Invite friends</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {activeCount > 0 && (
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{activeCount}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12, right: 12,
    height: 68,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  menuBtn: {
    width: 52, alignItems: "center", justifyContent: "center",
    height: "100%", position: "relative",
  },
  menuIconWrap: { gap: 4, alignItems: "flex-start" },
  menuLine: { height: 2, backgroundColor: Colors.text, borderRadius: 1 },
  menuBadge: {
    position: "absolute", top: 10, right: 8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.teal, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  menuBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#000" },
  separator: { width: 1, height: 36, backgroundColor: Colors.border },
  scrollContent: { paddingHorizontal: 12, gap: 8, alignItems: "center" },
  invitePrompt: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.tealDim, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.teal + "30",
  },
  inviteIconWrap: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.teal + "20", alignItems: "center", justifyContent: "center",
  },
  invitePromptText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.teal },
  liveTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingRight: 10, height: "100%",
    borderLeftWidth: 1, borderLeftColor: Colors.border,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  liveText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#4ADE80" },
});
