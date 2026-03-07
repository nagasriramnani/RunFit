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
  Clipboard,
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

export default function InvitePanel({ visible, onClose, topOffset }: Props) {
  const { generateInviteCode } = useGang();
  const [stage, setStage] = useState<Stage>("loading");
  const [inviteLink, setInviteLink] = useState("");
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const linkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
    `🏃 Join my DAUDLO gang and let's take over ${Platform.OS === "web" ? "the city" : "our city"}!\n\nUse my invite link to join:\n${inviteLink}\n\nDownload DAUDLO and run to claim territories 🗺️`;

  const shareWhatsApp = () => {
    const text = buildShareText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`)
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const shareInstagram = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: buildShareText(),
        url: inviteLink,
      });
    } catch (e) {
      console.log("Share error", e);
    }
  };

  const shareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}&quote=${encodeURIComponent(buildShareText())}`;
    Linking.openURL(url);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const shareNative = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: buildShareText(),
        url: inviteLink,
      });
    } catch (e) {
      console.log("Share error", e);
    }
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
      <LinearGradient
        colors={[Colors.bg2, Colors.bg3]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.handle} />

      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="person-add" size={18} color={Colors.teal} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Invite to Your Gang</Text>
          <Text style={styles.subtitle}>Share the link with your friends</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={18} color={Colors.text2} />
        </TouchableOpacity>
      </View>

      {stage === "loading" ? (
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
              <LinearGradient
                colors={["#25D366", "#128C7E"]}
                style={styles.shareBtnGrad}
              >
                <Ionicons name="logo-whatsapp" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.shareBtnLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn} onPress={shareInstagram}>
              <LinearGradient
                colors={["#E1306C", "#833AB4", "#F77737"]}
                style={styles.shareBtnGrad}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="logo-instagram" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.shareBtnLabel}>Instagram</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn} onPress={shareFacebook}>
              <LinearGradient
                colors={["#1877F2", "#0A5DC2"]}
                style={styles.shareBtnGrad}
              >
                <Ionicons name="logo-facebook" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.shareBtnLabel}>Facebook</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn} onPress={shareNative}>
              <LinearGradient
                colors={[Colors.bg3, Colors.bg2]}
                style={[styles.shareBtnGrad, { borderWidth: 1, borderColor: Colors.border }]}
              >
                <Ionicons name="share-outline" size={22} color={Colors.text} />
              </LinearGradient>
              <Text style={styles.shareBtnLabel}>More</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
    paddingHorizontal: 16, paddingVertical: 12,
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
  loadingSection: {
    paddingHorizontal: 16, paddingBottom: 20, alignItems: "center", gap: 8,
  },
  loadingText: {
    fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text2,
  },
  readySection: {
    paddingHorizontal: 16, paddingBottom: 20, gap: 12,
  },
  linkSection: { gap: 8 },
  linkLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.teal,
    letterSpacing: 1.5,
  },
  shareLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.text3,
    letterSpacing: 1.5,
  },
  shareRow: {
    flexDirection: "row", gap: 10, justifyContent: "space-between",
  },
  shareBtn: { flex: 1, alignItems: "center", gap: 6 },
  shareBtnGrad: {
    width: 54, height: 54, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  shareBtnLabel: {
    fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.text2, textAlign: "center",
  },
});
