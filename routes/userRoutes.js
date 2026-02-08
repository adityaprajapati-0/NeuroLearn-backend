import express from "express";
import { query, generateID } from "../db.js";

const router = express.Router();

// Synchronize or Register User
router.post("/sync", async (req, res) => {
  const { email, name, role: desiredRole } = req.body;

  try {
    // Check if user exists
    const existingUser = await query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (existingUser.rows.length > 0) {
      let user = existingUser.rows[0];
      console.log(
        `👤 Sync: ${email}, DB Role: ${user.role}, Requested: ${desiredRole}`,
      );

      // If user is student but logs in as teacher/admin, update role
      if (desiredRole && user.role === "student" && desiredRole !== "student") {
        console.log(`🆙 Upgrading ${email} to ${desiredRole}`);
        const updateRes = await query(
          "UPDATE users SET role = $1 WHERE email = $2 RETURNING *",
          [desiredRole, email],
        );
        user = updateRes.rows[0];
      }

      return res.json({
        ok: true,
        user,
        message: "User synchronized",
      });
    }

    // Assign custom ID based on role - ensure desiredRole is tracked
    const userRole = desiredRole || "student";
    const prefix = userRole === "teacher" ? "NLTRE" : "NLST";
    const newID = generateID(prefix);

    const newUser = await query(
      "INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4) RETURNING *",
      [newID, email, name, userRole],
    );

    res.json({
      ok: true,
      user: newUser.rows[0],
      message: "New user registered in DB",
    });
  } catch (err) {
    console.error("❌ User Sync Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Get all users (Admin only)
router.get("/", async (req, res) => {
  try {
    const result = await query("SELECT * FROM users ORDER BY created_at DESC");
    res.json({ ok: true, users: result.rows });
  } catch (err) {
    console.error("❌ Fetch Users Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Update user role
router.patch("/:id/role", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    const result = await query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING *",
      [role, id],
    );
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error("❌ Update Role Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Delete dependent chat messages
    await query("DELETE FROM chat_messages WHERE sender_id = $1", [id]);

    // 2. Clear teacher registrations
    await query("DELETE FROM teacher_registrations WHERE teacher_id = $1", [
      id,
    ]);

    // 3. Remove from users table
    const result = await query("DELETE FROM users WHERE id = $1 RETURNING *", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    res.json({
      ok: true,
      message: "User removed from platform",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Delete User Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Update student global metadata (solved_ids, visited_ids)
router.patch("/:id/meta", async (req, res) => {
  const { id } = req.params;
  const { solved_ids, visited_ids } = req.body;

  console.log(`📝 Meta Update for User ${id}:`, {
    solved_ids: solved_ids?.length,
    visited_ids: visited_ids?.length,
  });

  try {
    const result = await query(
      "UPDATE users SET solved_ids = $1, visited_ids = $2 WHERE id = $3 RETURNING *",
      [JSON.stringify(solved_ids || []), JSON.stringify(visited_ids || []), id],
    );

    if (result.rows.length === 0) {
      console.warn(`⚠️ User not found for meta update: ${id}`);
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error("❌ Update Meta Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Get Platform Stats (Admin only)
router.get("/stats", async (req, res) => {
  try {
    const userStats = await query(
      "SELECT role, COUNT(*) as count FROM users GROUP BY role",
    );
    const courseStats = await query(
      "SELECT is_approved, COUNT(*) as count FROM courses GROUP BY is_approved",
    );
    const enrollmentCount = await query(
      "SELECT COUNT(*) as count FROM enrollments",
    );

    const stats = {
      totalUsers: userStats.rows.reduce((acc, r) => acc + parseInt(r.count), 0),
      students: parseInt(
        userStats.rows.find((r) => r.role === "student")?.count || 0,
      ),
      teachers: parseInt(
        userStats.rows.find((r) => r.role === "teacher")?.count || 0,
      ),
      admins: parseInt(
        userStats.rows.find((r) => r.role === "admin")?.count || 0,
      ),
      approvedCourses: parseInt(
        courseStats.rows.find((r) => r.is_approved === true)?.count || 0,
      ),
      pendingCourses: parseInt(
        courseStats.rows.find((r) => r.is_approved === false)?.count || 0,
      ),
      enrollments: parseInt(enrollmentCount.rows[0].count),
    };

    res.json({ ok: true, stats });
  } catch (err) {
    console.error("❌ Fetch Stats Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

export default router;
