import { query, pool } from "./db.js";

async function migrate() {
  console.log("🔄 Starting Database Migration v2...");

  try {
    // 1. Update Courses Table
    console.log("📦 Updating courses table...");

    // Add status column if it doesn't exist
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='status') THEN
          ALTER TABLE courses ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
        END IF;
      END $$;
    `);

    // Add rejection_reason column
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='rejection_reason') THEN
          ALTER TABLE courses ADD COLUMN rejection_reason TEXT;
        END IF;
      END $$;
    `);

    // Migrate existing data
    await query(
      `UPDATE courses SET status = 'approved' WHERE is_approved = true AND status = 'pending'`,
    );
    await query(
      `UPDATE courses SET status = 'pending' WHERE is_approved = false AND status = 'pending'`,
    );

    console.log("✅ Courses table updated.");

    // 2. Create Chats Table
    console.log("💬 Creating chats table...");
    await query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        course_id VARCHAR(255) REFERENCES courses(id) ON DELETE CASCADE,
        student_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        teacher_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(course_id, student_id, teacher_id)
      );
    `);
    console.log("✅ Chats table created.");

    // 3. Create Messages Table
    console.log("📨 Creating messages table...");
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        media_url TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ Messages table created.");

    console.log("🎉 Migration v2 completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
