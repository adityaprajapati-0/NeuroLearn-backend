import express from "express";
import { query } from "../db.js";

const router = express.Router();

// Get or Create Chat Room for a Course and Student
router.post("/room", async (req, res) => {
  const { courseId, studentId, teacherId } = req.body;

  if (!courseId || !studentId || !teacherId) {
    return res
      .status(400)
      .json({ ok: false, message: "Missing required fields" });
  }

  try {
    // Check if chat exists
    const existingChat = await query(
      "SELECT * FROM chats WHERE course_id = $1 AND student_id = $2 AND teacher_id = $3",
      [courseId, studentId, teacherId],
    );

    if (existingChat.rows.length > 0) {
      return res.json({ ok: true, chat: existingChat.rows[0] });
    }

    // Create new chat
    const newChat = await query(
      "INSERT INTO chats (course_id, student_id, teacher_id) VALUES ($1, $2, $3) RETURNING *",
      [courseId, studentId, teacherId],
    );

    res.json({ ok: true, chat: newChat.rows[0], isNew: true });
  } catch (err) {
    console.error("❌ Create Chat Room Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Get Messages for a Chat Room
router.get("/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;

  try {
    const messages = await query(
      "SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC",
      [chatId],
    );
    res.json({ ok: true, messages: messages.rows });
  } catch (err) {
    console.error("❌ Fetch Messages Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Send Message (Persistence)
router.post("/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;
  const { senderId, content, mediaUrl } = req.body;

  try {
    // Verify chat exists
    const chatCheck = await query("SELECT * FROM chats WHERE id = $1", [
      chatId,
    ]);
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Chat not found" });
    }

    const newMessage = await query(
      "INSERT INTO messages (chat_id, sender_id, content, media_url) VALUES ($1, $2, $3, $4) RETURNING *",
      [chatId, senderId, content, mediaUrl || null],
    );

    // Update chat updated_at
    await query("UPDATE chats SET updated_at = NOW() WHERE id = $1", [chatId]);

    const messageData = newMessage.rows[0];

    // Emit to socket room
    if (req.io) {
      req.io.to(`chat_${chatId}`).emit("receive_message", messageData);
      console.log(`📡 Emitted message to chat_${chatId}`);
    }

    res.json({ ok: true, message: messageData });
  } catch (err) {
    console.error("❌ Send Message Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

// Mark Messages as Read
router.patch("/:chatId/read", async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body; // The user catching up (reader)

  try {
    // Mark messages as read where sender is NOT the reader
    await query(
      "UPDATE messages SET is_read = true WHERE chat_id = $1 AND sender_id != $2",
      [chatId, userId],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Mark Read Error:", err);
    res.status(500).json({ ok: false, message: "Database error" });
  }
});

export default router;
