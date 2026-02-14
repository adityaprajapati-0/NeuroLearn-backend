import { pool } from "./db.js";

const schema = `
-- Drop existing tables if they exist (Caution: Destructive)
-- DROP TABLE IF EXISTS chat_messages;
-- DROP TABLE IF EXISTS teacher_registrations;
-- DROP TABLE IF EXISTS courses;
-- DROP TABLE IF EXISTS users;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(20) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL, -- 'student', 'teacher', 'admin'
  solved_ids JSONB DEFAULT '[]',
  visited_ids JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: courses
CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(20) PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  level VARCHAR(50),
  teacher_id VARCHAR(20) REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  rejection_reason TEXT,
  content JSONB, -- Stores modules, quizzes, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: teachers (Tracks courses managed by teachers)
CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  teacher_id VARCHAR(20) REFERENCES users(id),
  course_id VARCHAR(20) REFERENCES courses(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: enrollments (Tracks students in courses)
CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(20) REFERENCES users(id),
  course_id VARCHAR(20) REFERENCES courses(id),
  progress JSONB DEFAULT '{}', -- Stores practiceScore, finalScore, passed, etc.
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, course_id)
);

-- Table: chats
CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  course_id VARCHAR(255) REFERENCES courses(id) ON DELETE CASCADE,
  student_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  teacher_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, student_id, teacher_id)
);

-- Table: messages
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
  sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Migrations for existing tables
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='solved_ids') THEN
    ALTER TABLE users ADD COLUMN solved_ids JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='visited_ids') THEN
    ALTER TABLE users ADD COLUMN visited_ids JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrollments' AND column_name='progress') THEN
    ALTER TABLE enrollments ADD COLUMN progress JSONB DEFAULT '{}';
  END IF;
END $$;
`;

async function initDB() {
  console.log("⏳ Initializing Neon Database Schema...");
  try {
    const client = await pool.connect();
    await client.query(schema);
    console.log("✅ Database Schema Initialized Successfully!");
    client.release();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error initializing database:", err);
    process.exit(1);
  }
}

initDB();
