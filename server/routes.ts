import type { Express } from "express";
import { createServer, type Server } from "node:http";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function registerRoutes(app: Express): Promise<Server> {

  app.post("/api/users/register", async (req, res) => {
    try {
      const { name, email, city, colorIndex } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: "name and email required" });
      }
      const existing = await pool.query(
        "SELECT * FROM daudlo_users WHERE email = $1",
        [email]
      );
      if (existing.rows.length > 0) {
        const user = existing.rows[0];
        await pool.query(
          "UPDATE daudlo_users SET name=$1, city=$2, color_index=$3, last_seen=$4 WHERE id=$5",
          [name, city || user.city, colorIndex ?? user.color_index, Date.now(), user.id]
        );
        return res.json({
          id: user.id,
          name,
          email: user.email,
          city: city || user.city,
          colorIndex: colorIndex ?? user.color_index,
          inviteCode: user.invite_code,
          totalKm: parseFloat(user.total_km) || 0,
          streak: user.streak || 0,
          zonesOwned: user.zones_owned || 0,
          profilePicture: user.profile_picture || null,
        });
      }
      const id =
        Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      const inviteCode =
        "DAUDLO_" +
        Math.random().toString(36).substr(2, 8).toUpperCase();
      await pool.query(
        `INSERT INTO daudlo_users (id, name, email, city, color_index, invite_code, last_seen)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, name, email, city || "Mumbai", colorIndex ?? 0, inviteCode, Date.now()]
      );
      return res.json({
        id,
        name,
        email,
        city: city || "Mumbai",
        colorIndex: colorIndex ?? 0,
        inviteCode,
        totalKm: 0,
        streak: 0,
        zonesOwned: 0,
        profilePicture: null,
      });
    } catch (e: any) {
      console.error("Register error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/users/me", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) return res.status(401).json({ error: "No user ID" });
      const result = await pool.query(
        "SELECT * FROM daudlo_users WHERE id = $1",
        [userId]
      );
      if (result.rows.length === 0)
        return res.status(404).json({ error: "User not found" });
      const u = result.rows[0];
      return res.json({
        id: u.id,
        name: u.name,
        email: u.email,
        city: u.city,
        colorIndex: u.color_index,
        inviteCode: u.invite_code,
        totalKm: parseFloat(u.total_km) || 0,
        streak: u.streak || 0,
        zonesOwned: u.zones_owned || 0,
        profilePicture: u.profile_picture || null,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/users/invite-code", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) return res.status(401).json({ error: "No user ID" });
      const result = await pool.query(
        "SELECT invite_code FROM daudlo_users WHERE id = $1",
        [userId]
      );
      if (result.rows.length === 0)
        return res.status(404).json({ error: "User not found" });
      return res.json({ inviteCode: result.rows[0].invite_code });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/users/join", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) return res.status(401).json({ error: "No user ID" });
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "code required" });

      const trimmed = code.trim().toUpperCase();
      const friendResult = await pool.query(
        "SELECT * FROM daudlo_users WHERE invite_code = $1",
        [trimmed]
      );
      if (friendResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "No user found with that invite code" });
      }
      const friend = friendResult.rows[0];
      if (friend.id === userId) {
        return res
          .status(400)
          .json({ error: "You can't add yourself" });
      }

      const existingFwd = await pool.query(
        "SELECT id FROM friendships WHERE user_id=$1 AND friend_id=$2",
        [userId, friend.id]
      );
      if (existingFwd.rows.length > 0) {
        return res
          .status(409)
          .json({ error: "Already friends", friendName: friend.name });
      }

      await pool.query(
        "INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [userId, friend.id]
      );
      await pool.query(
        "INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [friend.id, userId]
      );

      return res.json({
        success: true,
        friend: {
          id: friend.id,
          name: friend.name,
          email: friend.email,
          city: friend.city,
          colorIndex: friend.color_index,
        },
      });
    } catch (e: any) {
      console.error("Join error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/users/location", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) return res.status(401).json({ error: "No user ID" });
      const { latitude, longitude, isTracking } = req.body;
      await pool.query(
        `UPDATE daudlo_users SET last_lat=$1, last_lng=$2, is_tracking=$3, last_seen=$4
         WHERE id=$5`,
        [latitude, longitude, !!isTracking, Date.now(), userId]
      );
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/users/stats", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) return res.status(401).json({ error: "No user ID" });
      const { addKm, streak, zonesOwned } = req.body;
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (addKm !== undefined && addKm > 0) {
        updates.push(`total_km = total_km + $${idx}`);
        values.push(addKm);
        idx++;
      }
      if (streak !== undefined) {
        updates.push(`streak = $${idx}`);
        values.push(streak);
        idx++;
      }
      if (zonesOwned !== undefined) {
        updates.push(`zones_owned = $${idx}`);
        values.push(zonesOwned);
        idx++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No stats to update" });
      }

      updates.push(`last_seen = $${idx}`);
      values.push(Date.now());
      idx++;
      values.push(userId);

      await pool.query(
        `UPDATE daudlo_users SET ${updates.join(", ")} WHERE id = $${idx}`,
        values
      );

      const result = await pool.query(
        "SELECT total_km, streak, zones_owned FROM daudlo_users WHERE id = $1",
        [userId]
      );
      const u = result.rows[0];
      return res.json({
        totalKm: parseFloat(u.total_km) || 0,
        streak: u.streak || 0,
        zonesOwned: u.zones_owned || 0,
      });
    } catch (e: any) {
      console.error("Stats error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/users/profile-picture", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) return res.status(401).json({ error: "No user ID" });
      const { profilePicture } = req.body;
      if (!profilePicture) return res.status(400).json({ error: "profilePicture required" });

      await pool.query(
        "UPDATE daudlo_users SET profile_picture = $1 WHERE id = $2",
        [profilePicture, userId]
      );
      return res.json({ success: true });
    } catch (e: any) {
      console.error("Profile picture error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const city = req.query.city as string;
      let query: string;
      let params: any[] = [];

      if (city && city !== "all" && city !== "All Cities") {
        query = `SELECT id, name, email, city, color_index, total_km, streak, zones_owned, profile_picture
                 FROM daudlo_users WHERE city = $1 ORDER BY total_km DESC LIMIT 50`;
        params = [city];
      } else {
        query = `SELECT id, name, email, city, color_index, total_km, streak, zones_owned, profile_picture
                 FROM daudlo_users ORDER BY total_km DESC LIMIT 50`;
      }

      const result = await pool.query(query, params);
      const entries = result.rows.map((r, i) => ({
        id: r.id,
        name: r.name,
        city: r.city,
        colorIndex: r.color_index,
        totalKm: parseFloat(r.total_km) || 0,
        streak: r.streak || 0,
        zonesOwned: r.zones_owned || 0,
        profilePicture: r.profile_picture || null,
        rank: i + 1,
      }));
      return res.json({ entries });
    } catch (e: any) {
      console.error("Leaderboard error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/users/friends", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) return res.status(401).json({ error: "No user ID" });
      const result = await pool.query(
        `SELECT u.id, u.name, u.email, u.city, u.color_index, 
                u.last_lat, u.last_lng, u.is_tracking, u.last_seen,
                u.total_km, u.streak, u.zones_owned, u.profile_picture
         FROM friendships f
         JOIN daudlo_users u ON u.id = f.friend_id
         WHERE f.user_id = $1
         ORDER BY u.last_seen DESC`,
        [userId]
      );
      const now = Date.now();
      const friends = result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        city: r.city,
        colorIndex: r.color_index,
        lastLat: r.last_lat,
        lastLng: r.last_lng,
        isTracking: r.is_tracking,
        lastSeen: parseInt(r.last_seen),
        isActive: now - parseInt(r.last_seen) < 120000,
        totalKm: parseFloat(r.total_km) || 0,
        streak: r.streak || 0,
        zonesOwned: r.zones_owned || 0,
        profilePicture: r.profile_picture || null,
      }));
      return res.json({ friends });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/users/friends/:friendId", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) return res.status(401).json({ error: "No user ID" });
      const { friendId } = req.params;
      await pool.query(
        "DELETE FROM friendships WHERE user_id=$1 AND friend_id=$2",
        [userId, friendId]
      );
      await pool.query(
        "DELETE FROM friendships WHERE user_id=$1 AND friend_id=$2",
        [friendId, userId]
      );
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
