import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import MapView, { Polygon, Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGame, Zone } from "@/contexts/GameContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGang } from "@/contexts/GangContext";
import { Colors, ZoneColors } from "@/constants/colors";
import ZoneDetailCard from "@/components/ZoneDetailCard";
import MapSideMenu from "@/components/MapSideMenu";
import InvitePanel from "@/components/InvitePanel";
import GangMembersStrip from "@/components/GangMembersStrip";
import FriendMapMarkers from "@/components/FriendMapMarkers.native";

function PulsingLocationMarker({ color }: { color: string }) {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim1 = Animated.loop(
      Animated.timing(pulse1, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(pulse2, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim1.start();
    anim2.start();
    return () => {
      anim1.stop();
      anim2.stop();
    };
  }, []);

  const ring1Style = {
    transform: [{ scale: pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.5, 3.2] }) }],
    opacity: pulse1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] }),
  };
  const ring2Style = {
    transform: [{ scale: pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 3.2] }) }],
    opacity: pulse2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.2, 0] }),
  };

  return (
    <View style={markerStyles.container}>
      <Animated.View style={[markerStyles.ring, { backgroundColor: color }, ring1Style]} />
      <Animated.View style={[markerStyles.ring, { backgroundColor: color }, ring2Style]} />
      <View style={[markerStyles.outerDot, { borderColor: color }]}>
        <View style={[markerStyles.innerDot, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const markerStyles = StyleSheet.create({
  container: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 20, height: 20, borderRadius: 10 },
  outerDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#fff", borderWidth: 3,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 6,
  },
  innerDot: { width: 8, height: 8, borderRadius: 4 },
});

function ZoneMarkerBadge({ zone }: { zone: Zone }) {
  const zc = ZoneColors[zone.colorIndex];
  const alertAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (zone.status === "under_attack") {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(alertAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
          Animated.timing(alertAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [zone.status]);

  return (
    <Animated.View
      style={[
        zoneMarker.container,
        { borderColor: zc.stroke, transform: [{ scale: alertAnim }] },
      ]}
    >
      <Text style={[zoneMarker.health, {
        color: zone.health > 60 ? Colors.teal : zone.health > 30 ? Colors.orange : Colors.red,
      }]}>
        {Math.round(zone.health)}%
      </Text>
      {zone.status !== "owned" && (
        <View style={[zoneMarker.dot, {
          backgroundColor: zone.status === "under_attack" ? Colors.red : Colors.orange,
        }]} />
      )}
    </Animated.View>
  );
}

const zoneMarker = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg2, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3,
    borderWidth: 1, alignItems: "center", flexDirection: "row", gap: 4,
  },
  health: { fontFamily: "Inter_700Bold", fontSize: 11 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

function SpeedBadge({ speedKmh, isPaused }: { speedKmh: number; isPaused: boolean }) {
  const color = isPaused ? Colors.red : speedKmh > 10 ? Colors.orange : Colors.teal;
  return (
    <View style={[sbStyles.container, { borderColor: color + "40" }]}>
      <Text style={[sbStyles.speed, { color }]}>{speedKmh.toFixed(1)}</Text>
      <Text style={sbStyles.unit}>km/h</Text>
    </View>
  );
}

const sbStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg2, borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: 8, alignItems: "center", borderWidth: 1, minWidth: 72,
  },
  speed: { fontFamily: "Inter_700Bold", fontSize: 18 },
  unit: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.text2 },
});

export default function TerritoryMap() {
  const insets = useSafeAreaInsets();
  const {
    zones, tracking, startTracking, stopTracking,
    locationPermission, requestLocationPermission,
    currentLocation,
  } = useGame();
  const { user } = useAuth();
  const { gangMembers, updateMyLocation } = useGang();
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const mapRef = useRef<any>(null);
  const didCenterOnUser = useRef(false);

  const playerColor = user ? ZoneColors[user.colorIndex].stroke : Colors.teal;
  const stripTop = insets.top + 8;
  const inviteTop = stripTop + 68 + 10;

  useEffect(() => {
    if (currentLocation) {
      updateMyLocation(currentLocation.latitude, currentLocation.longitude, tracking.isTracking);

      if (mapRef.current) {
        if (tracking.isTracking) {
          // Pokemon GO style 3D tracking
          const headingToUse = currentLocation.heading !== undefined ? currentLocation.heading : 0;
          mapRef.current.animateCamera({
            center: { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
            pitch: 60, // 3D tilt
            heading: headingToUse, // Align with user's movement direction
            zoom: 18.5, // Close zoom
            altitude: 200,
          }, { duration: 1200 });
        } else if (!didCenterOnUser.current) {
          // Standard top-down view on initial load
          didCenterOnUser.current = true;
          mapRef.current.animateCamera({
            center: { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
            pitch: 0,
            heading: 0,
            zoom: 16,
            altitude: 1000,
          }, { duration: 1200 });
        }
      }
    }
  }, [currentLocation, tracking.isTracking]);

  const handleTrackingToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (tracking.isTracking) {
      stopTracking();
      // Reset camera to top-down view when stopping
      if (currentLocation && mapRef.current) {
        mapRef.current.animateCamera({
          center: { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
          pitch: 0,
          heading: 0,
          zoom: 16,
          altitude: 1000,
        }, { duration: 1000 });
      }
    } else {
      await startTracking();
      if (currentLocation && mapRef.current) {
        const headingToUse = currentLocation.heading !== undefined ? currentLocation.heading : 0;
        mapRef.current.animateCamera({
          center: { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
          pitch: 60,
          heading: headingToUse,
          zoom: 18.5,
          altitude: 200,
        }, { duration: 1000 });
      }
    }
  };

  const handleMyLocation = () => {
    if (currentLocation && mapRef.current) {
      Haptics.selectionAsync();

      if (tracking.isTracking) {
        // Return to 3D view if tracking
        const headingToUse = currentLocation.heading !== undefined ? currentLocation.heading : 0;
        mapRef.current.animateCamera({
          center: { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
          pitch: 60,
          heading: headingToUse,
          zoom: 18.5,
          altitude: 200,
        }, { duration: 800 });
      } else {
        // Standard view if not tracking
        mapRef.current.animateCamera({
          center: { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
          pitch: 0,
          heading: 0,
          zoom: 16,
          altitude: 1000,
        }, { duration: 800 });
      }
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 20.5937,
          longitude: 78.9629,
          latitudeDelta: 30,
          longitudeDelta: 30,
        }}
        customMapStyle={darkMapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        pitchEnabled={true}
        rotateEnabled={true}
      >
        {zones.map((zone) => {
          const zc = ZoneColors[zone.colorIndex];
          return (
            <React.Fragment key={zone.id}>
              <Polygon
                coordinates={zone.coords}
                fillColor={zc.fill}
                strokeColor={zc.stroke}
                strokeWidth={2}
                tappable
                onPress={() => {
                  setSelectedZone(zone);
                  Haptics.selectionAsync();
                }}
              />
              <Marker
                coordinate={{ latitude: zone.centerLat, longitude: zone.centerLng }}
                onPress={() => {
                  setSelectedZone(zone);
                  Haptics.selectionAsync();
                }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={zone.status !== "owned"}
              >
                <ZoneMarkerBadge zone={zone} />
              </Marker>
            </React.Fragment>
          );
        })}

        {tracking.isTracking && tracking.coords.length > 1 && (
          <>
            <Polyline
              coordinates={tracking.coords}
              strokeColor={playerColor}
              strokeWidth={4}
            />
            <Polyline
              coordinates={tracking.coords}
              strokeColor={playerColor + "30"}
              strokeWidth={16}
            />
          </>
        )}

        {tracking.coveredArea && tracking.coveredArea.length > 2 && (
          <Polygon
            coordinates={tracking.coveredArea}
            fillColor={playerColor + "20"}
            strokeColor={playerColor + "60"}
            strokeWidth={1.5}
          />
        )}

        {currentLocation && locationPermission && (
          <Marker
            coordinate={currentLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges
          >
            <PulsingLocationMarker color={playerColor} />
          </Marker>
        )}

        <FriendMapMarkers members={gangMembers} />
      </MapView>

      <GangMembersStrip
        topOffset={stripTop}
        onOpenMenu={() => setMenuOpen(true)}
      />

      {tracking.isTracking && (
        <View style={[styles.trackingBar, { top: stripTop + 68 + 8 }]}>
          <View style={[styles.trackingDot, { backgroundColor: tracking.isPaused ? Colors.red : playerColor }]} />
          <Text style={styles.trackingText}>
            {tracking.isPaused ? "PAUSED" : "TRACKING"} · {tracking.currentKm.toFixed(2)} km
          </Text>
          {tracking.isTracking && (
            <SpeedBadge speedKmh={tracking.speedKmh} isPaused={!!tracking.isPaused} />
          )}
        </View>
      )}

      {!!tracking.speedWarning && (
        <View style={[styles.speedWarningOverlay, { top: stripTop + 68 + 60 }]}>
          <View style={styles.speedWarningCard}>
            <Ionicons name="warning" size={22} color={Colors.red} />
            <Text style={styles.speedWarningText}>Slow down—cycling/vehicles don't count</Text>
          </View>
        </View>
      )}

      <View style={[styles.rightControls, { bottom: (insets.bottom || 20) + 90 }]}>
        {locationPermission && (
          <TouchableOpacity style={styles.myLocBtn} onPress={handleMyLocation}>
            <Ionicons name="locate" size={20} color={Colors.text} />
          </TouchableOpacity>
        )}
        {!locationPermission && (
          <TouchableOpacity style={styles.permBtn} onPress={requestLocationPermission}>
            <Ionicons name="location" size={16} color={Colors.bg} />
            <Text style={styles.permBtnText}>Enable GPS</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={handleTrackingToggle}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={tracking.isTracking ? [Colors.red, "#CC1A2F"] : [Colors.teal, "#00BDA8"]}
            style={styles.trackBtnGradient}
          >
            <Ionicons
              name={tracking.isTracking ? "stop" : "walk"}
              size={28}
              color={Colors.bg}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <InvitePanel
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        topOffset={inviteTop}
      />

      <MapSideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onAddFriend={() => setInviteOpen(true)}
      />

      {selectedZone && (
        <View style={[styles.detailCard, { paddingBottom: insets.bottom }]}>
          <ZoneDetailCard zone={selectedZone} onClose={() => setSelectedZone(null)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  trackingBar: {
    position: "absolute", alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.bg2, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  trackingDot: { width: 8, height: 8, borderRadius: 4 },
  trackingText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.text, letterSpacing: 0.6 },
  speedWarningOverlay: {
    position: "absolute", left: 20, right: 20, alignItems: "center",
  },
  speedWarningCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,61,87,0.15)", borderColor: "rgba(255,61,87,0.5)",
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
  },
  speedWarningText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.red, flex: 1 },
  rightControls: { position: "absolute", right: 20, alignItems: "center", gap: 12 },
  myLocBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.bg2, borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  permBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.teal,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  permBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.bg },
  trackBtn: {
    width: 64, height: 64, borderRadius: 32, overflow: "hidden",
    shadowColor: Colors.teal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 10,
  },
  trackBtnGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  detailCard: { position: "absolute", bottom: 0, left: 0, right: 0 },
});

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0A0A0F" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "rgba(240,240,248,0.45)" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0A0A0F" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1C1C26" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#13131A" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#252534" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1C1C26" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0A0E17" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#0F0F18" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0C1410" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#13131A" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1C1C26" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "rgba(240,240,248,0.6)" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "rgba(240,240,248,0.5)" }] },
];
