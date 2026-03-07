import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useGang } from "@/contexts/GangContext";
import { Colors, ZoneColors } from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
  "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Surat",
  "Other City",
];

const COLOR_NAMES = ["Teal", "Purple", "Orange", "Red", "Blue", "Green"];

function AnimatedColorDot({ index, selected, onPress }: {
  index: number; selected: boolean; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(selected ? 1 : 0.85)).current;
  const zc = ZoneColors[index];

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.15 : 0.85,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  }, [selected]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[
        styles.colorDot,
        { backgroundColor: zc.stroke, transform: [{ scale }] },
        selected && styles.colorDotSelected,
      ]}>
        {selected && <Ionicons name="checkmark" size={16} color="#000" />}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signInExisting } = useAuth();
  const { restoreUser } = useGang();
  const [step, setStep] = useState<"welcome" | "signup" | "login">("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [selectedCity, setSelectedCity] = useState("Mumbai");
  const [selectedColor, setSelectedColor] = useState(0);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  const goToStep = (target: "signup" | "login") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setStep(target));
  };

  const goBack = () => {
    setStep("welcome");
    setLoginError("");
    setNameError("");
    setEmailError("");
    slideAnim.setValue(0);
  };

  const validateAndSignUp = async () => {
    let valid = true;
    if (!name.trim() || name.trim().length < 2) {
      setNameError("Enter your name (at least 2 characters)");
      valid = false;
    } else {
      setNameError("");
    }
    if (!email.trim() || !email.includes("@")) {
      setEmailError("Enter a valid email address");
      valid = false;
    } else {
      setEmailError("");
    }
    if (!valid) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLoading(true);
    try {
      await signIn({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        city: selectedCity,
        colorIndex: selectedColor,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginEmail.includes("@")) {
      setLoginError("Enter the email you signed up with");
      return;
    }
    setLoginError("");
    setIsLoading(true);
    try {
      const base = getApiUrl();
      const url = new URL("/api/users/login", base).toString();
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase() }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (data.error === "no_account") {
          setLoginError("No account found with this email. Try signing up instead.");
        } else {
          setLoginError("Something went wrong. Please try again.");
        }
        return;
      }
      const data = await resp.json();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await restoreUser(data.id, data.inviteCode);
      await signInExisting({
        id: data.id,
        name: data.name,
        email: data.email,
        city: data.city,
        colorIndex: data.colorIndex,
        joinedAt: Date.now(),
      });
    } catch (e) {
      setLoginError("Could not connect to server. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "welcome") {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <LinearGradient
          colors={["rgba(0,229,200,0.08)", "transparent", "rgba(168,85,247,0.05)"]}
          style={StyleSheet.absoluteFill}
          locations={[0, 0.5, 1]}
        />
        <View style={styles.logoSection}>
          <View style={styles.logoRing}>
            <LinearGradient
              colors={[Colors.teal, Colors.purple]}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="walk" size={40} color="#000" />
            </LinearGradient>
          </View>
          <Text style={styles.logoText}>DAUDLO</Text>
          <Text style={styles.tagline}>Run your city. Own it.</Text>
        </View>

        <View style={styles.pitchCards}>
          {[
            { icon: "map" as const, color: Colors.teal, title: "Claim Territory", desc: "Run GPS loops to own real city zones" },
            { icon: "shield" as const, color: Colors.purple, title: "Defend & Attack", desc: "Rival runners steal your zones daily" },
            { icon: "trophy" as const, color: Colors.orange, title: "Compete & Win", desc: "Climb city leaderboards with friends" },
          ].map((card) => (
            <View key={card.title} style={styles.pitchCard}>
              <View style={[styles.pitchIcon, { backgroundColor: card.color + "15" }]}>
                <Ionicons name={card.icon} size={18} color={card.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pitchTitle}>{card.title}</Text>
                <Text style={styles.pitchDesc}>{card.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.authSection}>
          <TouchableOpacity
            style={styles.signUpBtn}
            onPress={() => goToStep("signup")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.teal, "#00BDA8"]}
              style={styles.authBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="person-add" size={18} color="#000" />
              <Text style={styles.signUpBtnText}>Sign Up</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => goToStep("login")}
            activeOpacity={0.85}
          >
            <Ionicons name="log-in-outline" size={18} color={Colors.teal} />
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By continuing you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    );
  }

  if (step === "login") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.container, { paddingTop: topPad + 16 }]}>
          <LinearGradient
            colors={["rgba(0,229,200,0.06)", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.profileHeader}>
            <View style={[styles.profilePreviewAvatar, { backgroundColor: Colors.teal + "20" }]}>
              <Ionicons name="person" size={36} color={Colors.teal} />
            </View>
            <Text style={styles.profileHeaderTitle}>Welcome Back</Text>
            <Text style={styles.profileHeaderSub}>Enter the email you signed up with to restore your account</Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>YOUR EMAIL</Text>
              <View style={[styles.inputWrapper, loginError ? styles.inputError : null]}>
                <Ionicons name="mail-outline" size={18} color={Colors.text2} />
                <TextInput
                  style={styles.input}
                  value={loginEmail}
                  onChangeText={(t) => { setLoginEmail(t); setLoginError(""); }}
                  placeholder="you@gmail.com"
                  placeholderTextColor={Colors.text3}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  autoFocus
                />
              </View>
              {!!loginError && <Text style={styles.errorText}>{loginError}</Text>}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.joinBtn, isLoading && styles.joinBtnLoading]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[Colors.teal, "#00BDA8"]}
              style={styles.joinBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Ionicons name="log-in" size={20} color="#000" />
                  <Text style={styles.joinBtnText}>Login</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchAuthBtn}
            onPress={() => { setStep("signup"); setLoginError(""); }}
          >
            <Text style={styles.switchAuthText}>
              Don't have an account? <Text style={styles.switchAuthLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.container]}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={["rgba(0,229,200,0.06)", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.profileHeader}>
          <View style={[styles.profilePreviewAvatar, { backgroundColor: ZoneColors[selectedColor].stroke + "20" }]}>
            <Text style={[styles.profilePreviewLetter, { color: ZoneColors[selectedColor].stroke }]}>
              {name ? name.charAt(0).toUpperCase() : "?"}
            </Text>
          </View>
          <Text style={styles.profileHeaderTitle}>Create Your Profile</Text>
          <Text style={styles.profileHeaderSub}>Choose your identity on the battlefield</Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>YOUR NAME</Text>
            <View style={[styles.inputWrapper, nameError ? styles.inputError : null]}>
              <Ionicons name="person-outline" size={18} color={Colors.text2} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(t) => { setName(t); setNameError(""); }}
                placeholder="Aakash Desai"
                placeholderTextColor={Colors.text3}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <View style={[styles.inputWrapper, emailError ? styles.inputError : null]}>
              <Ionicons name="mail-outline" size={18} color={Colors.text2} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setEmailError(""); }}
                placeholder="you@gmail.com"
                placeholderTextColor={Colors.text3}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
              />
            </View>
            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>YOUR CITY</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityRow}
            >
              {CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.cityChip, selectedCity === city && styles.cityChipActive]}
                  onPress={() => {
                    setSelectedCity(city);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={[styles.cityChipText, selectedCity === city && styles.cityChipTextActive]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ZONE COLOR</Text>
            <Text style={styles.colorSubtext}>This is the color of your territories on the map</Text>
            <View style={styles.colorRow}>
              {ZoneColors.map((_, i) => (
                <AnimatedColorDot
                  key={i}
                  index={i}
                  selected={selectedColor === i}
                  onPress={() => {
                    setSelectedColor(i);
                    Haptics.selectionAsync();
                  }}
                />
              ))}
            </View>
            <Text style={[styles.colorNameText, { color: ZoneColors[selectedColor].stroke }]}>
              {COLOR_NAMES[selectedColor]}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.joinBtn, isLoading && styles.joinBtnLoading]}
          onPress={validateAndSignUp}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          <LinearGradient
            colors={[Colors.teal, "#00BDA8"]}
            style={styles.joinBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="flag" size={20} color="#000" />
                <Text style={styles.joinBtnText}>Start Conquering</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchAuthBtn}
          onPress={() => { setStep("login"); setNameError(""); setEmailError(""); }}
        >
          <Text style={styles.switchAuthText}>
            Already have an account? <Text style={styles.switchAuthLink}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  logoSection: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  logoRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 1.5, borderColor: Colors.tealMid,
    padding: 3, marginBottom: 4,
  },
  logoGradient: {
    flex: 1, borderRadius: 40, alignItems: "center", justifyContent: "center",
  },
  logoText: {
    fontFamily: "Inter_700Bold", fontSize: 42, color: Colors.text,
    letterSpacing: 8,
  },
  tagline: {
    fontFamily: "Inter_400Regular", fontSize: 16, color: Colors.text2, letterSpacing: 1,
  },
  pitchCards: { paddingHorizontal: 20, gap: 10, marginBottom: 32 },
  pitchCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.bg2, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  pitchIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  pitchTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 2 },
  pitchDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text2 },
  authSection: { paddingHorizontal: 20, gap: 12 },
  signUpBtn: {
    borderRadius: 14, overflow: "hidden",
  },
  authBtnGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16,
  },
  signUpBtnText: {
    fontFamily: "Inter_700Bold", fontSize: 16, color: "#000",
  },
  loginBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 14,
    backgroundColor: Colors.bg2, borderWidth: 1, borderColor: Colors.border,
  },
  loginBtnText: {
    fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.teal,
  },
  termsText: {
    fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.text3, textAlign: "center",
    marginTop: 4,
  },
  backBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
    marginHorizontal: 12, marginBottom: 8,
  },
  profileHeader: { alignItems: "center", paddingBottom: 28, paddingHorizontal: 20 },
  profilePreviewAvatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  profilePreviewLetter: { fontFamily: "Inter_700Bold", fontSize: 32 },
  profileHeaderTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text, marginBottom: 4 },
  profileHeaderSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text2, textAlign: "center" },
  formSection: { paddingHorizontal: 20, gap: 20, marginBottom: 28 },
  inputGroup: { gap: 8 },
  inputLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.teal,
    letterSpacing: 1.5,
  },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.bg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputError: { borderColor: Colors.red + "60" },
  input: {
    flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.red },
  cityRow: { gap: 8, paddingVertical: 4 },
  cityChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border,
  },
  cityChipActive: { backgroundColor: Colors.tealDim, borderColor: Colors.teal + "60" },
  cityChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text2 },
  cityChipTextActive: { color: Colors.teal },
  colorSubtext: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text2 },
  colorRow: { flexDirection: "row", gap: 14, paddingVertical: 8 },
  colorDot: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
  },
  colorDotSelected: {
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  colorNameText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  joinBtn: { marginHorizontal: 20, borderRadius: 14, overflow: "hidden" },
  joinBtnLoading: { opacity: 0.7 },
  joinBtnGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 18,
  },
  joinBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#000" },
  switchAuthBtn: {
    alignItems: "center", paddingVertical: 20,
  },
  switchAuthText: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text2,
  },
  switchAuthLink: {
    fontFamily: "Inter_600SemiBold", color: Colors.teal,
  },
});
