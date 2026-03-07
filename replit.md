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
- `daudlo_users` — id, name, email, city, color_index, invite_code (unique), last_lat, last_lng, is_tracking, last_seen, created_at, total_km, streak, zones_owned, profile_picture, wins, losses
- `friendships` — id, user_id, friend_id, created_at (unique constraint on user_id+friend_id)

## Backend API Routes (server/routes.ts)
- `POST /api/users/register` — Register/update user by email (upsert), returns invite code + stats
- `POST /api/users/login` — Login by email, returns full user data (404 if not found)
- `GET /api/users/me` — Get current user with stats + profile picture (x-user-id header)
- `GET /api/users/invite-code` — Get user's invite code
- `POST /api/users/join` — Join by invite code (bidirectional friendship)
- `POST /api/users/location` — Update lat/lng/tracking status
- `GET /api/users/friends` — Get friends with live locations + stats
- `DELETE /api/users/friends/:friendId` — Remove friendship (bidirectional)
- `POST /api/users/stats` — Update user stats (addKm, streak, zonesOwned)
- `POST /api/users/profile-picture` — Save profile picture (base64 data URL)
- `GET /api/leaderboard?city=X` — Get ranked leaderboard filtered by city (or all)

## Gang / Friends Feature
- `GangContext` (contexts/GangContext.tsx) — Backend-connected gang system with real-time friend fetching (5s interval)
- `MapSideMenu` (components/MapSideMenu.tsx) — side drawer with proper render state management
- `GangMembersStrip` (components/GangMembersStrip.tsx) — floating strip with hamburger + member avatars
- `InvitePanel` (components/InvitePanel.tsx) — two-tab overlay: "Share Code" + "Join with Code"
- `FriendMapMarkers.native.tsx` — friend location markers on native map
- Invite codes shared as text (e.g. DAUDLO_XXXXXXXX)
- Friendships are bidirectional
- Location updates sent to backend every 500ms (debounced)

## Auth Flow
- `AuthContext` (contexts/AuthContext.tsx) — local profile auth with signIn (new) + signInExisting (restore)
- Welcome screen has two buttons: Sign Up (new users) + Login (returning users)
- Sign Up: Profile creation → name, email, city, color → creates new account
- Login: Email lookup → POST /api/users/login → restores all data (friends, stats, invite code)
- `GangContext.restoreUser()` sets serverUserId + inviteCode directly in context on login
- Backend upserts by email on register — same email always returns same server user
- On sign out, clears both @daudlo_user and @daudlo_server_user from AsyncStorage
- Re-login with same email restores all friends, stats, invite code
- `_layout.tsx` auto-registers user with backend if not yet registered

## Key Features
1. **Google-Style Login** — onboarding with name/email/city/color picker
2. **GPS Tracking Engine** — Location tracking with 14 km/h speed cap
3. **Live Running Path** — Colored Polyline + glow overlay while running
4. **Worldwide GPS Map** — Auto-centers on user's real location
5. **War Room Dashboard** — Real stats from DB (streak, km, zones); empty states for new users
6. **City Leaderboard** — City dropdown selector, ranked by zones/km/streak, data from DB
7. **Profile & Rivals** — Real friend data from DB, profile picture upload, invite code
8. **Real-time Friend Locations** — Live friend markers on map from backend
9. **Profile Pictures** — Upload via expo-image-picker, stored as base64 in DB
10. **City-Filtered Rankings** — Dropdown to switch cities or view all

## File Structure
```
app/
  _layout.tsx          # Root layout with providers + auto-register
  login.tsx            # Google-style onboarding
  (tabs)/
    _layout.tsx        # Tab bar
    index.tsx          # Map screen
    warroom.tsx        # War Room dashboard (real stats from DB)
    leaderboard.tsx    # City rankings with city dropdown
    profile.tsx        # Player profile + invite code + profile picture + rivals
contexts/
  AuthContext.tsx       # User profile auth via AsyncStorage
  GameContext.tsx       # Game state: GPS tracking, stats from DB, leaderboard from DB
  GangContext.tsx       # Backend-connected gang system (API calls, friend fetching)
server/
  index.ts             # Express server setup, CORS
  routes.ts            # All /api routes including stats, leaderboard, profile-picture
components/
  TerritoryMap.native.tsx  # Native map with friend markers
  TerritoryMap.web.tsx     # Web fallback
  FriendMapMarkers.native.tsx # Friend markers on native map
  MapSideMenu.tsx          # Side drawer (useState rendered for proper unmount)
  GangMembersStrip.tsx     # Floating gang strip
  InvitePanel.tsx          # Invite/join panel
  ZoneDetailCard.tsx       # Zone detail modal
constants/
  colors.ts            # DAUDLO dark theme
```

## Critical Notes
- All mock/demo data has been removed — stats start at 0 for new users
- `react-native-maps` must use `.native.tsx` / `.web.tsx` extension
- CORS configured to allow `x-user-id` custom header
- User identification via `x-user-id` header
- `useNativeDriver: false` for width/height animations
- `useNativeDriver: true` only for transform/opacity animations
- MapSideMenu uses useState for rendered state (not __getValue)

## Design System
- Background: #0A0A0F (darkest), #13131A, #1C1C26
- Primary: #00E5C8 (Energy Teal)
- Danger: #FF3D57
- Warning: #FF8C42 (orange)
- Accent: #A855F7 (purple)
- Font: Inter (400/500/600/700)
- Zone Colors: Teal, Purple, Orange, Red, Blue, Green (indexed 0-5)

## Dependencies
- react-native-maps@1.18.0 (pinned for Expo Go)
- expo-location, expo-image-picker, expo-linear-gradient
- expo-haptics, expo-clipboard
- @expo/vector-icons (Ionicons)
- pg (PostgreSQL client)

## Workflows
- `Start Backend`: npm run server:dev (port 5000)
- `Start Frontend`: npm run expo:dev (port 8081)
