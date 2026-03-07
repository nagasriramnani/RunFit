import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Share,
  Linking,
  Platform,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ExpoClipboard from "expo-clipboard";
import { useGang } from "@/contexts/GangContext";
import { Colors, ZoneColors } from "@/constants/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  topOffset: number;
}

type Tab = "invite" | "join";
type Stage = "loading" | "ready";

function LoadingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 380, useNativeDriver: true }),
          Animated.delay((2 - i) * 180),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={dotStyles.row}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            dotStyles.dot,
            {
              opacity: dot,
              transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.3] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.teal },
});

function LinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await ExpoClipboard.setStringAsync(link);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={lbStyles.container}>
      <Text style={lbStyles.linkText} numberOfLines={1} ellipsizeMode="middle">{link}</Text>
      <TouchableOpacity style={lbStyles.copyBtn} onPress={handleCopy}>
        <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={copied ? Colors.teal : Colors.text2} />
      </TouchableOpacity>
    </View>
  );
}

const lbStyles = StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.bg3, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.teal + "30",
    paddingLeft: 12, paddingRight: 6, paddingVertical: 8,
  },
  linkText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text2, letterSpacing: 0.2 },
  copyBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: Colors.bg2, alignItems: "center", justifyContent: "center",
    marginLeft: 6,
  },
});

function JoinSection({ onClose }: { onClose: () => void }) {
  const { addMemberFromInvite } = useGang();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [success, setSuccess] = useState(false);
  const [addedName, setAddedName] = useState("");
  const checkAnim = useRef(new Animated.Value(0)).current;

  const handleJoin = async () => {
    if (!code.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJoining(true);
    await new Promise((r) => setTimeout(r, 1200));
    const result = await addMemberFromInvite(code.trim());
    setJoining(false);
    if (result) {
      setSuccess(true);
      setAddedName(code.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 180,
        friction: 14,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCode("");
        checkAnim.setValue(0);
      }, 1800);
    }
  };

  if (success) {
    return (
      <View style={jStyles.successWrap}>
        <Animated.View style={[jStyles.checkCircle, {
          transform: [{ scale: checkAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }],
          opacity: checkAnim,
        }]}>
          <Ionicons name="checkmark" size={32} color="#000" />
        </Animated.View>
        <Text style={jStyles.successTitle}>Added to your gang!</Text>
        <Text style={jStyles.successSub}>They'll appear on your map now</Text>
      </View>
    );
  }

  return (
    <View style={jStyles.container}>
      <Text style={jStyles.label}>ENTER INVITE CODE</Text>
      <View style={jStyles.inputRow}>
        <TextInput
          style={jStyles.input}
          value={code}
          onChangeText={setCode}
          placeholder="Paste code or link here"
          placeholderTextColor={Colors.text3}
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={handleJoin}
        />
        <TouchableOpacity
          style={[jStyles.joinBtn, (!code.trim() || joining) && jStyles.joinBtnDisabled]}
          onPress={handleJoin}
          disabled={!code.trim() || joining}
        >
          {joining ? (
            <View style={jStyles.spinner} />
          ) : (
            <Ionicons name="arrow-forward" size={18} color={code.trim() ? "#000" : Colors.text3} />
          )}
        </TouchableOpacity>
      </View>
      <Text style={jStyles.hintText}>
        Ask your friend for their invite code and paste it above
      </Text>
    </View>
  );
}

const jStyles = StyleSheet.create({
  container: { gap: 8 },
  label: {
    fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.teal, letterSpacing: 1.5,
  },
  inputRow: {
    flexDirection: "row", gap: 8,
  },
  input: {
    flex: 1, backgroundColor: Colors.bg3, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text,
  },
  joinBtn: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: Colors.teal, alignItems: "center", justifyContent: "center",
  },
  joinBtnDisabled: { backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border },
  spinner: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: Colors.teal, borderTopColor: "transparent",
  },
  hintText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text3 },
  successWrap: { alignItems: "center", paddingVertical: 12, gap: 8 },
  checkCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.teal, alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  successSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text2 },
});

export default function InvitePanel({ visible, onClose, topOffset }: Props) {
  const { generateInviteCode } = useGang();
  const [activeTab, setActiveTab] = useState<Tab>("invite");
  const [stage, setStage] = useState<Stage>("loading");
  const [inviteLink, setInviteLink] = useState("");
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const linkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setActiveTab("invite");
      setStage("loading");
      setInviteLink("");

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, tension: 200, friction: 20, useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1, duration: 250, useNativeDriver: true,
        }),
      ]).start();

      generateInviteCode().then((code) => {
        const link = `https://daudlo.app/join/${code}`;
        setTimeout(() => {
          setInviteLink(link);
          setStage("ready");
          Animated.spring(linkAnim, {
            toValue: 1, tension: 180, friction: 18, useNativeDriver: true,
          }).start();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 2200);
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -200, duration: 200, useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0, duration: 200, useNativeDriver: true,
        }),
      ]).start(() => {
        setStage("loading");
        linkAnim.setValue(0);
      });
    }
  }, [visible]);

  const buildShareText = () =>
    `🏃 Join my DAUDLO gang and let's take over the city!\n\nUse my invite link to join:\n${inviteLink}\n\nDownload DAUDLO and run to claim territories 🗺️`;

  const shareWhatsApp = () => {
    const text = buildShareText();
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`).catch(() =>
      Linking.openURL(`https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`)
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const shareInstagram = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ message: buildShareText(), url: inviteLink });
    } catch (e) {}
  };

  const shareFacebook = () => {
    Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}&quote=${encodeURIComponent(buildShareText())}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const shareNative = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ message: buildShareText(), url: inviteLink });
    } catch (e) {}
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topOffset,
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient colors={[Colors.bg2, Colors.bg3]} style={StyleSheet.absoluteFill} />
      <View style={styles.handle} />

      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="person-add" size={18} color={Colors.teal} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {activeTab === "invite" ? "Invite to Gang" : "Join a Gang"}
          </Text>
          <Text style={styles.subtitle}>
            {activeTab === "invite" ? "Share the link with friends" : "Enter a friend's code"}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={18} color={Colors.text2} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "invite" && styles.tabActive]}
          onPress={() => { setActiveTab("invite"); Haptics.selectionAsync(); }}
        >
          <Ionicons name="link" size={14} color={activeTab === "invite" ? Colors.teal : Colors.text3} />
          <Text style={[styles.tabText, activeTab === "invite" && styles.tabTextActive]}>
            Share Link
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "join" && styles.tabActive]}
          onPress={() => { setActiveTab("join"); Haptics.selectionAsync(); }}
        >
          <Ionicons name="enter" size={14} color={activeTab === "join" ? Colors.teal : Colors.text3} />
          <Text style={[styles.tabText, activeTab === "join" && styles.tabTextActive]}>
            Join with Code
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "invite" ? (
        stage === "loading" ? (
          <View style={styles.loadingSection}>
            <LoadingDots />
            <Text style={styles.loadingText}>Generating your invite link…</Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.readySection,
              {
                opacity: linkAnim,
                transform: [{ scale: linkAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
              },
            ]}
          >
            <View style={styles.linkSection}>
              <Text style={styles.linkLabel}>YOUR INVITE LINK</Text>
              <LinkBox link={inviteLink} />
            </View>
            <Text style={styles.shareLabel}>SHARE VIA</Text>
            <View style={styles.shareRow}>
              <TouchableOpacity style={styles.shareBtn} onPress={shareWhatsApp}>
                <LinearGradient colors={["#25D366", "#128C7E"]} style={styles.shareBtnGrad}>
                  <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.shareBtnLabel}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={shareInstagram}>
                <LinearGradient colors={["#E1306C", "#833AB4", "#F77737"]} style={styles.shareBtnGrad} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="logo-instagram" size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.shareBtnLabel}>Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={shareFacebook}>
                <LinearGradient colors={["#1877F2", "#0A5DC2"]} style={styles.shareBtnGrad}>
                  <Ionicons name="logo-facebook" size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.shareBtnLabel}>Facebook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={shareNative}>
                <LinearGradient colors={[Colors.bg3, Colors.bg2]} style={[styles.shareBtnGrad, { borderWidth: 1, borderColor: Colors.border }]}>
                  <Ionicons name="share-outline" size={22} color={Colors.text} />
                </LinearGradient>
                <Text style={styles.shareBtnLabel}>More</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )
      ) : (
        <View style={styles.joinSection}>
          <JoinSection onClose={onClose} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16, right: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
    zIndex: 100,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center", marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.tealDim, alignItems: "center", justifyContent: "center",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bg3, alignItems: "center", justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 12,
    borderRadius: 10, backgroundColor: Colors.bg, padding: 3,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8, borderRadius: 8,
  },
  tabActive: { backgroundColor: Colors.bg3 },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text3 },
  tabTextActive: { color: Colors.teal },
  loadingSection: {
    paddingHorizontal: 16, paddingBottom: 20, alignItems: "center", gap: 8,
  },
  loadingText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text2 },
  readySection: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  linkSection: { gap: 8 },
  linkLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.teal, letterSpacing: 1.5,
  },
  shareLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.text3, letterSpacing: 1.5,
  },
  shareRow: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  shareBtn: { flex: 1, alignItems: "center", gap: 6 },
  shareBtnGrad: {
    width: 54, height: 54, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  shareBtnLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.text2, textAlign: "center" },
  joinSection: { paddingHorizontal: 16, paddingBottom: 20 },
});
