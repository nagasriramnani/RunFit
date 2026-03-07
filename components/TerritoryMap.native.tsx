import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MapView, { Polygon, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGame, Zone } from "@/contexts/GameContext";
import { Colors, ZoneColors } from "@/constants/colors";
import ZoneDetailCard from "@/components/ZoneDetailCard";

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
  } = useGame();
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const mapRef = useRef<any>(null);

  const handleTrackingToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (tracking.isTracking) {
      stopTracking();
    } else {
      await startTracking();
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 19.0178,
          longitude: 72.8478,
          latitudeDelta: 0.18,
          longitudeDelta: 0.18,
        }}
        customMapStyle={darkMapStyle}
        showsUserLocation={!!locationPermission}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
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
              >
                <View style={[markerStyles.container, { borderColor: zc.stroke }]}>
                  <Text style={[markerStyles.health, {
                    color: zone.health > 60 ? Colors.teal : zone.health > 30 ? Colors.orange : Colors.red
                  }]}>
                    {Math.round(zone.health)}%
                  </Text>
                  {zone.status !== "owned" && (
                    <View style={[markerStyles.dot, {
                      backgroundColor: zone.status === "under_attack" ? Colors.red : Colors.orange
                    }]} />
                  )}
                </View>
              </Marker>
            </React.Fragment>
          );
        })}

        {tracking.isTracking && tracking.coords.length > 1 && (
          <Polygon
            coordinates={tracking.coords}
            fillColor="rgba(0,229,200,0.1)"
            strokeColor={Colors.teal}
            strokeWidth={2}
          />
        )}
      </MapView>

      <LinearGradient
        colors={["rgba(10,10,15,0.95)", "transparent"]}
        style={[styles.topGradient, { paddingTop: insets.top + 12 }]}
        pointerEvents="none"
      >
        <Text style={styles.logo}>DAUDLO</Text>
      </LinearGradient>

      <View style={[styles.topControls, { top: insets.top + 12 }]}>
        <View style={{ flex: 1 }} />
        {tracking.isTracking && (
          <SpeedBadge speedKmh={tracking.speedKmh} isPaused={!!tracking.isPaused} />
        )}
      </View>

      {!!tracking.speedWarning && (
        <View style={styles.speedWarningOverlay}>
          <View style={styles.speedWarningCard}>
            <Ionicons name="warning" size={22} color={Colors.red} />
            <Text style={styles.speedWarningText}>Slow down—cycling/vehicles don't count</Text>
          </View>
        </View>
      )}

      {tracking.isTracking && (
        <View style={[styles.trackingBar, { top: insets.top + 58 }]}>
          <View style={[styles.trackingDot, { backgroundColor: tracking.isPaused ? Colors.red : Colors.teal }]} />
          <Text style={styles.trackingText}>
            {tracking.isPaused ? "PAUSED" : "TRACKING"} · {tracking.currentKm.toFixed(2)} km
          </Text>
        </View>
      )}

      <View style={[styles.bottomControls, { bottom: (insets.bottom || 20) + 90 }]}>
        {!locationPermission && (
          <TouchableOpacity style={styles.permBtn} onPress={requestLocationPermission}>
            <Ionicons name="location" size={18} color={Colors.bg} />
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

      {selectedZone && (
        <View style={[styles.detailCard, { paddingBottom: insets.bottom }]}>
          <ZoneDetailCard zone={selectedZone} onClose={() => setSelectedZone(null)} />
        </View>
      )}
    </View>
  );
}

const markerStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg2, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3,
    borderWidth: 1, alignItems: "center", flexDirection: "row", gap: 4,
  },
  health: { fontFamily: "Inter_700Bold", fontSize: 11 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topGradient: {
    position: "absolute", top: 0, left: 0, right: 0, height: 120,
    paddingHorizontal: 20, justifyContent: "flex-start",
  },
  logo: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.teal, letterSpacing: 3 },
  topControls: {
    position: "absolute", left: 20, right: 20, flexDirection: "row", alignItems: "center", gap: 12,
  },
  trackingBar: {
    position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.bg2, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  trackingDot: { width: 8, height: 8, borderRadius: 4 },
  trackingText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.text, letterSpacing: 0.6 },
  speedWarningOverlay: {
    position: "absolute", top: 140, left: 20, right: 20, alignItems: "center",
  },
  speedWarningCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,61,87,0.15)", borderColor: "rgba(255,61,87,0.4)",
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
  },
  speedWarningText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.red, flex: 1 },
  bottomControls: { position: "absolute", right: 20, alignItems: "flex-end", gap: 12 },
  permBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.teal,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  permBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.bg },
  trackBtn: {
    width: 64, height: 64, borderRadius: 32, overflow: "hidden",
    shadowColor: Colors.teal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  trackBtnGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  detailCard: { position: "absolute", bottom: 0, left: 0, right: 0 },
});

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0A0A0F" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "rgba(240,240,248,0.4)" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0A0A0F" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1C1C26" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#13131A" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#222230" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0D1117" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#111118" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0F1A13" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#13131A" }] },
];
