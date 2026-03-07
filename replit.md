# DAUDLO - Territory-Based Running Game

## Overview
DAUDLO is a gamified territory-based running app for Indian Gen Z. Players "own" city neighborhoods by running GPS loops around them. Built with Expo + React Native.

## Architecture
- **Frontend**: Expo Router with file-based routing, React Native
- **Backend**: Express.js on port 5000 (API + landing page)
- **Frontend dev server**: Port 8081 (Expo Metro)
- **State**: React Context (AuthContext + GameContext) + AsyncStorage
- **Navigation**: 4-tab layout — Map, War Room, Rankings, Profile

## Auth Flow
- `AuthContext` (contexts/AuthContext.tsx) — Google-style local profile auth
- Login screen: Welcome → Profile setup (name, Gmail, city, color)
- Profile stored in AsyncStorage, persists across sessions
- Sign out from Profile tab → returns to login screen
- Root layout (`app/_layout.tsx`) redirects based on auth state

## Key Features
1. **Google-Style Login** — Google-branded onboarding with name/email/city/color picker
2. **GPS Tracking Engine** — Location tracking with 14 km/h speed cap; pauses + warns when exceeded
3. **Custom Animated Location Marker** — Pulsing double-ring in player's profile color
4. **Live Running Path** — Colored Polyline + glow overlay while running; convex hull area fill
5. **Worldwide GPS Map** — Auto-centers on user's real location anywhere in the world
6. **Gamified Map** — react-native-maps with zone polygons, health bars, dark map style
7. **War Room Dashboard** — Shows player's name from profile; streak display, zone health, active threats
8. **City Leaderboard** — Ranked by zones/km/streak with podium display
9. **Profile & Rivals** — Shows user's name/email/city/color; head-to-head win-loss records

## File Structure
```
app/
  _layout.tsx          # Root layout with AuthProvider + GameProvider + auth redirect
  login.tsx            # Google-style onboarding (welcome + profile setup)
  (tabs)/
    _layout.tsx        # Tab bar with NativeTabs (iOS 26+) / Classic Tabs fallback
    index.tsx          # Map screen
    warroom.tsx        # War Room dashboard (shows auth user name)
    leaderboard.tsx    # City rankings
    profile.tsx        # Player profile + sign out + friends
contexts/
  AuthContext.tsx       # User profile auth (name, email, city, colorIndex) via AsyncStorage
  GameContext.tsx       # Game state: zones, GPS tracking, friends, leaderboard
components/
  TerritoryMap.native.tsx  # Native map: animated location marker, polyline, area overlay
  TerritoryMap.web.tsx     # Web fallback: zone list with health bars
  ZoneDetailCard.tsx       # Zone detail modal
constants/
  colors.ts            # DAUDLO dark theme — Energy Teal (#00E5C8) primary
```

## Critical Notes
- `react-native-maps` must use `.native.tsx` / `.web.tsx` extension to avoid web crash
- Custom location marker uses `PulsingLocationMarker` component (no `showsUserLocation`)
- Map auto-centers on user's real GPS location once permission granted
- `useNativeDriver: false` for width/height animations (web compat)
- `useNativeDriver: true` only for transform/opacity animations

## Design System
- Background: #0A0A0F (darkest), #13131A, #1C1C26
- Primary: #00E5C8 (Energy Teal)
- Danger: #FF3D57 (attack/threat)
- Warning: #FF8C42 (orange)
- Accent: #A855F7 (purple)
- Font: Inter (400/500/600/700)
- Zone Colors: Teal, Purple, Orange, Red, Blue, Green (indexed 0-5)

## Dependencies
- react-native-maps@1.18.0 (pinned for Expo Go compatibility)
- expo-location (GPS tracking)
- expo-linear-gradient (background effects)
- expo-haptics (tactile feedback)
- @expo/vector-icons (Ionicons throughout)

## Workflows
- `Start Backend`: npm run server:dev (port 5000)
- `Start Frontend`: npm run expo:dev (port 8081)
