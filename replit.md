# DAUDLO - Territory-Based Running Game

## Overview
DAUDLO is a gamified territory-based running app for Indian Gen Z. Players "own" city neighborhoods by running GPS loops around them. Built with Expo + React Native.

## Architecture
- **Frontend**: Expo Router with file-based routing, React Native
- **Backend**: Express.js on port 5000 (API + landing page)
- **Frontend dev server**: Port 8081 (Expo Metro)
- **State**: React Context (GameContext) + AsyncStorage
- **Navigation**: 4-tab layout — Map, War Room, Rankings, Profile

## Key Features
1. **GPS Tracking Engine** — Location tracking with 14 km/h speed cap; pauses + warns when exceeded
2. **Gamified Map** — react-native-maps with zone polygons, health bars, dark map style
3. **War Room Dashboard** — Streak display, zone health, active threats with attack alerts
4. **City Leaderboard** — Ranked by zones/km/streak with podium display
5. **Profile & Rivals** — Head-to-head win-loss records with streak tier display

## File Structure
```
app/
  _layout.tsx          # Root layout with providers (GameProvider, QueryClient)
  (tabs)/
    _layout.tsx        # Tab bar with NativeTabs (iOS 26+) / Classic Tabs fallback
    index.tsx          # Map screen (react-native-maps with zone overlays)
    warroom.tsx        # War Room dashboard
    leaderboard.tsx    # City rankings
    profile.tsx        # Player profile + friends
contexts/
  GameContext.tsx      # Game state: zones, GPS tracking, friends, leaderboard
constants/
  colors.ts            # DAUDLO dark theme — Energy Teal (#00E5C8) primary
```

## Design System
- Background: #0A0A0F (darkest), #13131A, #1C1C26
- Primary: #00E5C8 (Energy Teal)
- Danger: #FF3D57 (attack/threat)
- Warning: #FF8C42 (orange)
- Accent: #A855F7 (purple)
- Font: Inter (400/500/600/700)

## Dependencies
- react-native-maps@1.18.0 (pinned for Expo Go compatibility)
- expo-location (GPS tracking)
- expo-linear-gradient (background effects)
- expo-haptics (tactile feedback)
- @expo/vector-icons (Ionicons throughout)

## Workflows
- `Start Backend`: npm run server:dev (port 5000)
- `Start Frontend`: npm run expo:dev (port 8081)
