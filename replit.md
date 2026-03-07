# DAUDLO - Territory-Based Running Game

## Overview
DAUDLO is a gamified territory-based running app for Indian Gen Z. Players "own" city neighborhoods by running GPS loops around them. Built with Expo + React Native + Express backend with PostgreSQL.

## Architecture
- **Frontend**: Expo Router with file-based routing, React Native
- **Backend**: Express.js on port 5000 (API + landing page)
- **Database**: PostgreSQL (daudlo_users + friendships tables)
- **Frontend dev server**: Port 8081 (Expo Metro)
- **State**: React Context (AuthContext + GameContext + GangContext) + AsyncStorage
- **Navigation**: 4-tab layout — Map, War Room, Rankings, Profile

## Database Tables
- `daudlo_users` — id, name, email, city, color_index, invite_code (unique), last_lat, last_lng, is_tracking, last_seen, created_at
- `friendships` — id, user_id, friend_id, created_at (unique constraint on user_id+friend_id)

## Backend API Routes (server/routes.ts)
- `POST /api/users/register` — Register/update user, returns invite code
- `GET /api/users/me` — Get current user (x-user-id header)
- `GET /api/users/invite-code` — Get user's invite code
- `POST /api/users/join` — Join by invite code (bidirectional friendship)
- `POST /api/users/location` — Update lat/lng/tracking status
- `GET /api/users/friends` — Get friends with live locations
- `DELETE /api/users/friends/:friendId` — Remove friendship (bidirectional)

## Gang / Friends Feature
- `GangContext` (contexts/GangContext.tsx) — Backend-connected gang system with real-time friend fetching (10s interval)
- `MapSideMenu` (components/MapSideMenu.tsx) — side drawer: profile, gang list, add friend, sign out
- `GangMembersStrip` (components/GangMembersStrip.tsx) — floating strip with hamburger + member avatars + active/running status
- `InvitePanel` (components/InvitePanel.tsx) — two-tab overlay: "Share Code" + "Join with Code" (with error handling)
- `FriendMapMarkers.native.tsx` — friend location markers on native map
- Invite codes shared as text (e.g. DAUDLO_XXXXXXXX)
- Friendships are bidirectional — when one user joins, both see each other
- Profile tab shows user's invite code with copy button
- Location updates sent to backend every 3s (debounced)

## Auth Flow
- `AuthContext` (contexts/AuthContext.tsx) — Google-style local profile auth
- Login screen: Welcome → Profile setup (name, Gmail, city, color)
- Profile stored in AsyncStorage, persists across sessions
- `_layout.tsx` auto-registers user with backend if not yet registered
- Sign out from Profile tab → returns to login screen

## Key Features
1. **Google-Style Login** — Google-branded onboarding with name/email/city/color picker
2. **GPS Tracking Engine** — Location tracking with 14 km/h speed cap; pauses + warns when exceeded
3. **Custom Animated Location Marker** — Pulsing double-ring in player's profile color
4. **Live Running Path** — Colored Polyline + glow overlay while running; convex hull area fill
5. **Worldwide GPS Map** — Auto-centers on user's real location anywhere in the world
6. **Gamified Map** — react-native-maps with zone polygons, health bars, dark map style
7. **War Room Dashboard** — Shows player's name from profile; streak display, zone health, active threats
8. **City Leaderboard** — Ranked by zones/km/streak with podium display
9. **Profile & Rivals** — Shows user's name/email/city/color; invite code; head-to-head win-loss records
10. **Real-time Friend Locations** — Live friend markers on map from backend

## File Structure
```
app/
  _layout.tsx          # Root layout with AuthProvider + GangProvider + GameProvider + auto-register
  login.tsx            # Google-style onboarding (welcome + profile setup)
  (tabs)/
    _layout.tsx        # Tab bar with NativeTabs (iOS 26+) / Classic Tabs fallback
    index.tsx          # Map screen
    warroom.tsx        # War Room dashboard
    leaderboard.tsx    # City rankings
    profile.tsx        # Player profile + invite code + sign out + friends
contexts/
  AuthContext.tsx       # User profile auth via AsyncStorage
  GameContext.tsx       # Game state: zones, GPS tracking, leaderboard
  GangContext.tsx       # Backend-connected gang system (API calls, friend fetching)
server/
  index.ts             # Express server setup, CORS (includes x-user-id), middleware
  routes.ts            # All /api routes for users, friendships, locations
  storage.ts           # Storage interface (legacy)
components/
  TerritoryMap.native.tsx  # Native map with friend markers + location updates
  TerritoryMap.web.tsx     # Web fallback: zone list
  FriendMapMarkers.native.tsx # Friend markers on native map
  MapSideMenu.tsx          # Side drawer menu
  GangMembersStrip.tsx     # Floating gang strip
  InvitePanel.tsx          # Invite/join panel with error handling
  ZoneDetailCard.tsx       # Zone detail modal
constants/
  colors.ts            # DAUDLO dark theme
```

## Critical Notes
- `react-native-maps` must use `.native.tsx` / `.web.tsx` extension to avoid web crash
- Custom location marker uses `PulsingLocationMarker` component (no `showsUserLocation`)
- CORS configured to allow `x-user-id` custom header
- User identification via `x-user-id` header (no auth tokens)
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
- expo-clipboard (copy invite codes)
- @expo/vector-icons (Ionicons throughout)
- pg (PostgreSQL client for backend)

## Workflows
- `Start Backend`: npm run server:dev (port 5000)
- `Start Frontend`: npm run expo:dev (port 8081)
