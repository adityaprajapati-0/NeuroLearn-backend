/**
 * Initialize Tutor Database Tables for NeuroLearn
 * Creates tables for persistent AI tutor sessions
 */

import { query } from "./db.js";

async function initTutorTables() {
  console.log("🔧 Creating tutor tables...");

  try {
    // Tutor Syllabuses Table
    await query(`
      CREATE TABLE IF NOT EXISTS tutor_syllabuses (
        id VARCHAR(20) PRIMARY KEY,
        user_id VARCHAR(20) REFERENCES users(id) ON DELETE SET NULL,
        topic VARCHAR(255) NOT NULL,
        syllabus_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ tutor_syllabuses table ready");

    // Tutor Sessions Table
    await query(`
      CREATE TABLE IF NOT EXISTS tutor_sessions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(20) REFERENCES users(id) ON DELETE SET NULL,
        syllabus_id VARCHAR(20) REFERENCES tutor_syllabuses(id) ON DELETE SET NULL,
        topic VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ tutor_sessions table ready");

    // Tutor Messages Table
    await query(`
      CREATE TABLE IF NOT EXISTS tutor_messages (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) REFERENCES tutor_sessions(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ tutor_messages table ready");

    // Create indexes for efficient queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tutor_syllabuses_user 
      ON tutor_syllabuses(user_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tutor_sessions_user 
      ON tutor_sessions(user_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tutor_messages_session 
      ON tutor_messages(session_id)
    `);
    console.log("✅ Indexes created");

    console.log("\n🎉 All tutor tables initialized successfully!");
  } catch (error) {
    console.error("❌ Error creating tutor tables:", error);
    throw error;
  }
}

// Run if executed directly
initTutorTables()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
