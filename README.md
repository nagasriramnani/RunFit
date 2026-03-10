# DAUDLO / RunFit

**Status: 🧪 Active Testing Phase**

**DAUDLO** (internally known as RunFit/Zone-Conqueror) is an interactive, location-based multiplayer running game where players jog or walk in the real world to claim virtual territories on a live map. Inspired by mechanics like Pokémon GO, users physically explore their city to paint the map, compete for zones with rival crews, secure streaks, and climb city-wide leaderboards.

---

## 🏃 Game Mechanics Overview

- **Location Tracking & Anti-Cheat:** Built on React Native's Background Geolocation, DAUDLO safely tracks movement only up to **20 km/h** to ensure runners legitimately walk or jog. Car driving or cycling will flag a warning and freeze tracking.
- **Dynamic Territories (PostGIS mesh calculations):** Runs are calculated strictly via PostgreSQL PostGIS geometry on the Cloud. Once a runner forms a closed loop, the enclosed area becomes their claimed physical territory (polygon mesh).
- **Rival Overlaps & Turf Wars:** The map is fully live. If Player B runs over Player A's active territory, the game engine natively extracts `ST_Difference` slices to chop away the original owner's turf dynamically.
- **Streak & Decay Mechanics:** Territories lose a certain percentage of "Health" over time. Running consecutive days boosts your *Streak Tier* (Bronze, Silver, Gold, Platinum, Diamond) which heavily buffers against turf decay.
- **Gang / Friend Synchronization:** Invite friends via unique 6-digit codes. Friends sync over Supabase Realtime Channels. When active, you can see your rival's Live Location via a 3D isometric Map View.
- **Pokémon GO-style Physics:** The mapping interface (`react-native-maps`) actively pivots to a 60-degree pitch following the user's heading to deliver a 3-dimensional immersive navigation experience.

---

## 🛠 Tech Stack

### Client (Frontend/Mobile)
- **Expo & React Native:** (SDK 52+ / React 18)
- **Expo Router:** Native file-based routing architecture.
- **React Native Maps:** Custom Apple/Google Maps rendering with polygon meshes, 3D pitch/bearing alignment, and dark mode thematic styling.
- **UI/UX:** Animated View transitions, Expo Haptics engine feedback, and heavily custom styling with responsive SVGs.

### Server (Backend/Database)
- **Supabase Cloud Project:** Hosted Postgres Database backing the entire operation.
- **Supabase Auth:** Realtime session persistence explicitly decoupling traditional email verification for an instant, frictionless onboarding flow.
- **PostGIS Extension:** Handles heavy lifting involving intersection slices, geometry validations, area calculation (`ST_Area`), and line closures.
- **Supabase Edge Functions:** Executes `finalize-run` logic under a secure environment. Invokes RPC database calls to grant territory logic post-run.
- **Supabase Realtime:** powers the live multiplayer marker tracking.

---

## 🏗 Setup and Local Development

*(Assuming Node v20+ and modern Expo tools)*

### 1. Environment Configuration
Within the `/Zone-Conqueror` physical root, you must establish an `.env` file referencing the specific Cloud environment variables:
```env
EXPO_PUBLIC_SUPABASE_URL=your_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Install Packages
```bash
npm install
```

### 3. Launch the Metro Bundler
```bash
npx expo start -c
```

*(You can test natively on iOS via the Expo Go app by scanning the CLI QR code, or fire up an Android Emulator via `a` parameter).*

---

## ⚠️ Known Testing Phase Constraints

Since DAUDLO is currently in an active global testing stage, be mindful of:
- **Location Permissions:** "Always allow" or "Allow While Using App" must natively be granted. Denying these will brick tracking mechanics.
- **Background Location:** iOS/Android sometimes throttle un-foregrounded interval checks. Keep the app awake or grant background permissions for long, extended runs.
- **Overlap Glitches:** While PostGIS calculates slices neatly, drawing very tiny slivers (< 10 sqm) are explicitly rejected by anti-cheat rules.

---

**Get Out There. Conquer Your Zones.**
