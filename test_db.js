import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });

async function test() {
  try {
    console.log("🔌 Connecting to DB...");
    const client = await pool.connect();
    console.log("✅ Connected.");

    // Check Users Table Schema
    console.log("\n🔍 Checking 'users' table columns:");
    const usersSchema = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';",
    );
    usersSchema.rows.forEach((r) =>
      console.log(` - ${r.column_name} (${r.data_type})`),
    );

    // Check Enrollments Table Schema
    console.log("\n🔍 Checking 'enrollments' table columns:");
    const enrollSchema = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'enrollments';",
    );
    enrollSchema.rows.forEach((r) =>
      console.log(` - ${r.column_name} (${r.data_type})`),
    );

    client.release();
  } catch (err) {
    console.error("❌ DB Error:", err);
  } finally {
    pool.end();
  }
}

test();
