import express from "express";
import {
  query,
  generateID,
  getCached,
  setCache,
  invalidateCache,
} from "../db.js";

const router = express.Router();

// Get courses (filtered by status for specific roles)
router.get("/", async (req, res) => {
  const { role, teacher_id, status } = req.query;
  const cacheKey = `courses:${role || "student"}:${teacher_id || "all"}:${status || "all"}`;

  // Check cache first (10 second TTL for course list)
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ ok: true, courses: cached, _cached: true });
  }

  try {
    let q = "SELECT * FROM courses";
    let params = [];
    let conditions = [];

    if (role === "admin") {
      // Admin sees everything, or filtered by status if provided
      if (status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(status);
      }
    } else if (teacher_id) {
      // Teacher sees their own courses (all statuses) AND approved courses from others?
      // Usually teacher dashboard fetches their OWN courses.
      // If fetching "My Courses":
      conditions.push(`teacher_id = $${params.length + 1}`);
      params.push(teacher_id);
    } else {
      // Student only sees approved
      conditions.push(`status = 'approved'`);
    }

    if (conditions.length > 0) {
      q += " WHERE " + conditions.join(" AND ");
    }

    q += " ORDER BY created_at DESC";

    const result = await query(q, params);

    // Cache the result
    setCache(cacheKey, result.rows, 10000);

    res.json({ ok: true, courses: result.rows });
  } catch (err) {
    console.error("❌ Fetch Courses Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Create new course
router.post("/", async (req, res) => {
  const { title, description, level, teacher_id, content, slug } = req.body;

  try {
    const courseID = generateID("NLCRE");
    const finalSlug =
      slug ||
      `${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`;

    // Default status is pending, unless specifically overridden (e.g. by admin)
    const status = req.body.status || "pending";

    const newCourse = await query(
      "INSERT INTO courses (id, slug, title, description, level, teacher_id, content, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [
        courseID,
        finalSlug,
        title,
        description,
        level,
        teacher_id,
        content || {},
        status,
      ],
    );

    // Register teacher for this course
    if (teacher_id) {
      await query(
        "INSERT INTO teachers (teacher_id, course_id) VALUES ($1, $2)",
        [teacher_id, courseID],
      );
    }

    res.json({ ok: true, course: newCourse.rows[0] });
    invalidateCache("courses:");
  } catch (err) {
    console.error("❌ Create Course Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Admin: Update Course Status (Approve/Reject)
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, rejection_reason } = req.body; // status: 'approved' | 'rejected' | 'pending'

  try {
    const result = await query(
      "UPDATE courses SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *",
      [status, rejection_reason || null, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Course not found" });
    }

    res.json({ ok: true, course: result.rows[0] });
    invalidateCache("courses:");
  } catch (err) {
    console.error("❌ Update Status Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Admin/Teacher: Update Course Content (Edit)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, level, content, status } = req.body;

  try {
    // If updating content, usually we might want to reset to pending if it was rejected?
    // For now, trust the incoming status or keep existing.
    // Ideally, if a teacher edits a rejected course, it might go back to pending?
    // Let's assume the frontend sends 'pending' when a teacher resubmits.

    let q =
      "UPDATE courses SET title = COALESCE($1, title), description = COALESCE($2, description), level = COALESCE($3, level), content = COALESCE($4, content)";
    const params = [title, description, level, content];
    let paramIdx = 5;

    if (status) {
      q += `, status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    // Reset rejection reason if status is pending or approved
    if (status === "pending" || status === "approved") {
      q += `, rejection_reason = NULL`;
    }

    q += ` WHERE id = $${paramIdx} RETURNING *`;
    params.push(id);

    const result = await query(q, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Course not found" });
    }

    res.json({ ok: true, course: result.rows[0] });
    invalidateCache("courses:");
  } catch (err) {
    console.error("❌ Update Course Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Enroll student in a course
// Enroll student in a course
router.post("/enroll", async (req, res) => {
  const { student_id, course_id } = req.body;

  console.log(
    `📝 Enrollment Request: Student ${student_id} -> Course ${course_id}`,
  );

  if (!student_id || !course_id) {
    return res
      .status(400)
      .json({ ok: false, message: "Missing student_id or course_id" });
  }

  try {
    const result = await query(
      "INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) ON CONFLICT (student_id, course_id) DO UPDATE SET enrolled_at = NOW() RETURNING *",
      [student_id, course_id],
    );
    res.json({ ok: true, enrollment: result.rows[0] });
  } catch (err) {
    console.error("❌ Enrollment Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Update enrollment progress
router.patch("/enroll/:studentId/:courseId", async (req, res) => {
  const { studentId, courseId } = req.params;
  const { progress } = req.body;
  try {
    const result = await query(
      "UPDATE enrollments SET progress = $1 WHERE student_id = $2 AND course_id = $3 RETURNING *",
      [JSON.stringify(progress), studentId, courseId],
    );
    res.json({ ok: true, enrollment: result.rows[0] });
  } catch (err) {
    console.error("❌ Update Progress Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Get enrolled courses for a student
router.get("/enrolled/:studentId", async (req, res) => {
  const { studentId } = req.params;
  try {
    const result = await query(
      "SELECT c.*, e.progress, e.enrolled_at FROM courses c JOIN enrollments e ON c.id = e.course_id WHERE e.student_id = $1",
      [studentId],
    );
    res.json({ ok: true, courses: result.rows });
  } catch (err) {
    console.error("❌ Fetch Enrolled Courses Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Get Enrolled Students for a Course
router.get("/:id/students", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      "SELECT u.id, u.name, u.email FROM users u JOIN enrollments e ON u.id = e.student_id WHERE e.course_id = $1",
      [id],
    );
    res.json({ ok: true, students: result.rows });
  } catch (err) {
    console.error("❌ Fetch Enrolled Students Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Approve/Reject Course
router.patch("/:id/approval", async (req, res) => {
  const { id } = req.params;
  const { is_approved } = req.body;

  try {
    const result = await query(
      "UPDATE courses SET is_approved = $1 WHERE id = $2 RETURNING *",
      [is_approved, id],
    );
    res.json({ ok: true, course: result.rows[0] });
  } catch (err) {
    console.error("❌ Update Approval Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Delete Course (Admin or Creator only)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { requester_id, role } = req.query; // Optional: for security check

  try {
    // Optional: Ownership check for teachers
    if (role === "teacher" && requester_id) {
      const check = await query(
        "SELECT teacher_id FROM courses WHERE id = $1",
        [id],
      );
      if (check.rows.length > 0 && check.rows[0].teacher_id !== requester_id) {
        return res
          .status(403)
          .json({ ok: false, message: "Forbidden: You don't own this course" });
      }
    }

    // 1. Delete dependent data
    await query("DELETE FROM enrollments WHERE course_id = $1", [id]);
    await query("DELETE FROM teachers WHERE course_id = $1", [id]);
    await query("DELETE FROM chat_messages WHERE course_id = $1", [id]);

    // 2. Delete the course itself
    const result = await query(
      "DELETE FROM courses WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Course not found" });
    }

    res.json({
      ok: true,
      message: "Course removed from platform",
      course: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Delete Course Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

export default router;
