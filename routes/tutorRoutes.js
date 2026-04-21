import express from "express";
import fetch from "node-fetch";
import http from "http";
import https from "https";
import { query, generateID } from "../db.js";

// Keep-alive agents to speed up internal Render-to-Render communication
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const getAgent = (url) => (url.startsWith("https") ? httpsAgent : httpAgent);

const router = express.Router();

// Python tutor service base URL
const TUTOR_SERVICE_URL =
  process.env.TUTOR_SERVICE_URL || "http://localhost:5001";

// Health check for tutor service
router.get("/health", async (req, res) => {
  try {
    const url = `${TUTOR_SERVICE_URL}/health`;
    const response = await fetch(url, { agent: getAgent(url) });
    const data = await response.json();
    res.json({ ok: true, tutor_service: data });
  } catch (err) {
    res.status(503).json({
      ok: false,
      message: "Tutor service unavailable",
      error: err.message,
    });
  }
});

// Generate syllabus for a topic
router.post("/create-syllabus", async (req, res) => {
  const { topic, userId } = req.body;

  if (!topic) {
    return res.json({ ok: false, message: "Topic is required" });
  }

  try {
    // Call Python service to generate syllabus
    const url = `${TUTOR_SERVICE_URL}/generate-syllabus`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
      agent: getAgent(url),
    });

    const data = await response.json();

    if (!data.success) {
      return res.json({
        ok: false,
        message: "Failed to generate syllabus",
        error: data.error,
      });
    }

    // Save syllabus to database if userId provided
    let syllabusId = null;
    if (userId) {
      try {
        syllabusId = generateID("NLSYL");
        await query(
          "INSERT INTO tutor_syllabuses (id, user_id, topic, syllabus_content) VALUES ($1, $2, $3, $4)",
          [syllabusId, userId, topic, data.syllabus],
        );
        console.log(`📚 Syllabus saved: ${syllabusId} for user ${userId}`);
      } catch (dbErr) {
        console.warn(
          "⚠️ Syllabus DB save failed (non-critical):",
          dbErr.message,
        );
      }
    }

    res.json({
      ok: true,
      topic: data.topic,
      syllabus: data.syllabus,
      syllabusId,
    });
  } catch (err) {
    console.error("❌ Create Syllabus Error:", err);
    res
      .status(500)
      .json({ ok: false, message: "Server error", error: err.message });
  }
});

// Initialize a new tutor session
router.post("/init-session", async (req, res) => {
  const { sessionId, syllabus, topic } = req.body;

  if (!sessionId || !syllabus || !topic) {
    return res.json({
      ok: false,
      message: "sessionId, syllabus, and topic are required",
    });
  }

  try {
    const url = `${TUTOR_SERVICE_URL}/init-tutor`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, syllabus, topic }),
      agent: getAgent(url),
    });

    const data = await response.json();

    if (!data.success) {
      return res.json({
        ok: false,
        message: "Failed to initialize tutor",
        error: data.error,
      });
    }

    // Save session to database if userId provided
    const userId = req.body.userId;
    const syllabusId = req.body.syllabusId;
    if (userId) {
      try {
        await query(
          "INSERT INTO tutor_sessions (id, user_id, syllabus_id, topic) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
          [sessionId, userId, syllabusId || null, topic],
        );
        console.log(`💬 Session created: ${sessionId} for user ${userId}`);
      } catch (dbErr) {
        console.warn(
          "⚠️ Session DB save failed (non-critical):",
          dbErr.message,
        );
      }
    }

    res.json({ ok: true, sessionId: data.sessionId, message: data.message });
  } catch (err) {
    console.error("❌ Init Session Error:", err);
    res
      .status(500)
      .json({ ok: false, message: "Server error", error: err.message });
  }
});

// Chat with tutor
router.post("/chat/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.json({ ok: false, message: "Message is required" });
  }

  try {
    const url = `${TUTOR_SERVICE_URL}/chat`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
      agent: getAgent(url),
    });

    const data = await response.json();

    if (!data.success) {
      return res.json({
        ok: false,
        message: "Failed to get tutor response",
        error: data.error,
      });
    }

    // Save messages to database
    try {
      await query(
        "INSERT INTO tutor_messages (session_id, role, content) VALUES ($1, $2, $3), ($1, $4, $5)",
        [sessionId, "user", message, "assistant", data.response],
      );
      await query(
        "UPDATE tutor_sessions SET updated_at = NOW() WHERE id = $1",
        [sessionId],
      );
    } catch (dbErr) {
      console.warn("⚠️ Message DB save failed (non-critical):", dbErr.message);
    }

    res.json({ ok: true, response: data.response, sessionId: data.sessionId });
  } catch (err) {
    console.error("❌ Chat Error:", err);
    res
      .status(500)
      .json({ ok: false, message: "Server error", error: err.message });
  }
});

// Get chat history
router.get("/history/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const url = `${TUTOR_SERVICE_URL}/get-history?sessionId=${sessionId}`;
    const response = await fetch(url, { agent: getAgent(url) });
    const data = await response.json();

    if (!data.success) {
      return res.json({
        ok: false,
        message: "Failed to get history",
        error: data.error,
      });
    }

    res.json({ ok: true, history: data.history, topic: data.topic });
  } catch (err) {
    console.error("❌ Get History Error:", err);
    res
      .status(500)
      .json({ ok: false, message: "Server error", error: err.message });
  }
});

// Get user's recent sessions for recovery
router.get("/user-sessions/:userId", async (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 5;

  try {
    const result = await query(
      `SELECT s.id, s.topic, s.created_at, s.updated_at, 
              (SELECT COUNT(*) FROM tutor_messages WHERE session_id = s.id) as message_count
       FROM tutor_sessions s 
       WHERE s.user_id = $1 
       ORDER BY s.updated_at DESC 
       LIMIT $2`,
      [userId, limit],
    );

    res.json({ ok: true, sessions: result.rows });
  } catch (err) {
    console.error("❌ Get User Sessions Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Get DB-stored history for a session (fallback if Python service is down)
router.get("/db-history/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const sessionResult = await query(
      "SELECT topic FROM tutor_sessions WHERE id = $1",
      [sessionId],
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Session not found" });
    }

    const messagesResult = await query(
      "SELECT role, content, created_at FROM tutor_messages WHERE session_id = $1 ORDER BY created_at ASC",
      [sessionId],
    );

    res.json({
      ok: true,
      topic: sessionResult.rows[0].topic,
      history: messagesResult.rows.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
  } catch (err) {
    console.error("❌ Get DB History Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

export default router;
