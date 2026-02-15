import pg from "pg";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Optimized Neon connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  // Performance optimizations
  max: 20, // Maximum connections
  min: 2, // Minimum connections to keep ready
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail fast on connection issues
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Connection warmup - pre-establish connections on startup
pool.on("connect", () => {
  console.log("🔌 DB connection established");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected DB error:", err.message);
});

// Warm up the pool on import
(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ DB pool warmed up");
  } catch (e) {
    console.warn("⚠️ DB warmup failed:", e.message);
  }
})();

/**
 * In-memory cache for frequently accessed data
 */
const cache = new Map();
const CACHE_TTL = 60000; // 60 seconds

export function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

export function setCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, { data, expiry: Date.now() + ttl });
}

export function invalidateCache(keyPattern) {
  for (const key of cache.keys()) {
    if (key.includes(keyPattern)) cache.delete(key);
  }
}

/**
 * Generates dynamic IDs like NLCRE..., NLST..., NLTRE...
 */
export function generateID(prefix) {
  const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}${randomPart}`;
}

/**
 * Optimized query with optional caching
 */
export async function query(text, params, options = {}) {
  const { cache: useCache, cacheKey, cacheTTL } = options;

  if (useCache && cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const result = await pool.query(text, params);

  if (useCache && cacheKey) {
    setCache(cacheKey, result, cacheTTL);
  }

  return result;
}

/**
 * Batch multiple queries in a single connection (faster for multiple ops)
 */
export async function batchQuery(queries) {
  const client = await pool.connect();
  try {
    const results = [];
    for (const { text, params } of queries) {
      results.push(await client.query(text, params));
    }
    return results;
  } finally {
    client.release();
  }
}

export default pool;
