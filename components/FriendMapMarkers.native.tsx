import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { GangMember } from "@/contexts/GangContext";
import { Colors, ZoneColors } from "@/constants/colors";

function RunningPulse({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        pulseStyles.ring,
        {
          backgroundColor: color,
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.5] }) }],
          opacity: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.2, 0] }),
        },
      ]}
    />
  );
}

const pulseStyles = StyleSheet.create({
  ring: { position: "absolute", width: 16, height: 16, borderRadius: 8 },
});

function FriendMarkerView({ member }: { member: GangMember }) {
  const zc = ZoneColors[member.colorIndex];
  return (
    <View style={fmStyles.container}>
      {member.isRunning && <RunningPulse color={zc.stroke} />}
      <View style={[fmStyles.outerRing, { borderColor: zc.stroke }]}>
        <Text style={[fmStyles.letter, { color: zc.stroke }]}>
          {member.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={fmStyles.labelWrap}>
        <View style={[fmStyles.labelBg, { backgroundColor: Colors.bg2 }]}>
          <Text style={[fmStyles.labelText, { color: zc.stroke }]} numberOfLines={1}>
            {member.name.split(" ")[0]}
          </Text>
          {member.isRunning && (
            <Ionicons name="walk" size={9} color={Colors.teal} style={{ marginLeft: 2 }} />
          )}
        </View>
      </View>
    </View>
  );
}

const fmStyles = StyleSheet.create({
  container: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  outerRing: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.bg2, borderWidth: 2.5,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 5,
  },
  letter: { fontFamily: "Inter_700Bold", fontSize: 12 },
  labelWrap: { position: "absolute", bottom: -2, alignItems: "center" },
  labelBg: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 5, paddingVertical: 1.5,
    borderRadius: 4, borderWidth: 1, borderColor: Colors.border,
  },
  labelText: { fontFamily: "Inter_600SemiBold", fontSize: 8, maxWidth: 40 },
});

export default function FriendMapMarkers({ members }: { members: GangMember[] }) {
  const activeMembers = members.filter((m) => m.isActive && m.liveLocation);

  return (
    <>
      {activeMembers.map((member) => {
        const zc = ZoneColors[member.colorIndex];
        return (
          <React.Fragment key={member.id}>
            <Marker
              coordinate={member.liveLocation!}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={member.isRunning}
            >
              <FriendMarkerView member={member} />
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}
