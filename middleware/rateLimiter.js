/**
 * Rate Limiter Middleware for NeuroLearn API
 * - AI endpoints: 30 requests/minute
 * - General API: 100 requests/minute
 */

const requestCounts = new Map();
const AI_LIMIT = 30;
const GENERAL_LIMIT = 100;
const WINDOW_MS = 60 * 1000; // 1 minute

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.windowStart > WINDOW_MS) {
      requestCounts.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupOldEntries, WINDOW_MS);

/**
 * Get client identifier from request
 */
function getClientId(req) {
  return (
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}

/**
 * Rate limiter for AI endpoints (/api/ai/*, /api/tutor/*)
 */
export function aiRateLimiter(req, res, next) {
  const clientId = `ai:${getClientId(req)}`;
  const now = Date.now();

  let data = requestCounts.get(clientId);

  if (!data || now - data.windowStart > WINDOW_MS) {
    data = { count: 0, windowStart: now };
    requestCounts.set(clientId, data);
  }

  data.count++;

  if (data.count > AI_LIMIT) {
    const retryAfter = Math.ceil((data.windowStart + WINDOW_MS - now) / 1000);
    res.set("Retry-After", retryAfter);
    return res.status(429).json({
      ok: false,
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many AI requests. Please wait before trying again.",
      retryAfter,
    });
  }

  next();
}

/**
 * Rate limiter for general API endpoints
 */
export function generalRateLimiter(req, res, next) {
  const clientId = `general:${getClientId(req)}`;
  const now = Date.now();

  let data = requestCounts.get(clientId);

  if (!data || now - data.windowStart > WINDOW_MS) {
    data = { count: 0, windowStart: now };
    requestCounts.set(clientId, data);
  }

  data.count++;

  if (data.count > GENERAL_LIMIT) {
    const retryAfter = Math.ceil((data.windowStart + WINDOW_MS - now) / 1000);
    res.set("Retry-After", retryAfter);
    return res.status(429).json({
      ok: false,
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please slow down.",
      retryAfter,
    });
  }

  next();
}

export default { aiRateLimiter, generalRateLimiter };
