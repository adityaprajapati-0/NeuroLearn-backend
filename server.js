import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import userRoutes from "./routes/userRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import tutorRoutes from "./routes/tutorRoutes.js";
import { query } from "./db.js";
import aiHints from "./judge_v99/aiHints.js";
import { executeMultiLangEngine } from "./judge_v100/executor.js";
import { validateMultiLang } from "./judge_v100/validator.js";
import { resolveQuestionCheck } from "./judge_v99/questionCheckTool.js";
import { analyzeCodeWithAI } from "./judge_v100/aiJudge.js";
import { aiRateLimiter, generalRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

// Aggressive compression for faster responses (level 6 is optimal balance)
app.use(
  compression({
    level: 6,
    threshold: 512, // Compress anything over 512 bytes
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);

// Security with minimal overhead
app.use(helmet({ contentSecurityPolicy: false }));

// CORS with caching for preflight requests
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    maxAge: 86400, // Cache preflight for 24 hours
  }),
);

// Fast JSON parsing with limit
app.use(express.json({ limit: "1mb" }));

// Response time header for debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 500)
      console.log(`⚠️ Slow: ${req.method} ${req.path} - ${duration}ms`);
  });
  next();
});

// Cache headers for GET requests (short-term)
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.includes("/api/users/")) {
    res.set("Cache-Control", "public, max-age=5"); // 5 second cache
  }
  next();
});

// Keep-alive for persistent connections
app.use((req, res, next) => {
  res.set("Connection", "keep-alive");
  res.set("Keep-Alive", "timeout=30, max=100");
  next();
});

const httpServer = createServer(app);

// Socket.IO with optimized settings
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Rate limiting (only for AI-heavy endpoints)
app.use("/api/ai", aiRateLimiter);
app.use("/api/tutor", aiRateLimiter);
app.use("/api/code", aiRateLimiter);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/tutor", tutorRoutes);

async function markQuestionSolvedForUser(userId, questionId) {
  try {
    const userRes = await query("SELECT solved_ids FROM users WHERE id = $1", [
      userId,
    ]);

    if (userRes.rows.length === 0) return;

    const currentSolved = userRes.rows[0].solved_ids || [];
    if (currentSolved.includes(Number(questionId))) return;

    const updatedSolved = [...currentSolved, Number(questionId)];
    await query("UPDATE users SET solved_ids = $1 WHERE id = $2", [
      updatedSolved,
      userId,
    ]);
  } catch (error) {
    console.error("Update error:", error);
  }
}

app.post("/api/code/run", async (req, res) => {
  const {
    code,
    language = "javascript",
    questionId,
    questionContext,
    userId,
  } = req.body;

  if (!code) return res.json({ success: false, error: "No code provided" });

  // No question attached: run only, no validation.
  if (!questionId) {
    const runResult = await executeMultiLangEngine(code, language);
    return res.json({
      ...runResult,
      checked: false,
      autoSubmitted: false,
    });
  }

  const resolved = resolveQuestionCheck(questionId, questionContext);
  if (!resolved.ok) {
    const runResult = await executeMultiLangEngine(code, language);
    return res.json({
      ...runResult,
      checked: false,
      autoSubmitted: false,
      checkError: resolved.error,
    });
  }

  // Run with a real testcase input so execution reflects the current question.
  const runInput = resolved.testcases[0]?.input ?? null;
  const runExpected = resolved.testcases[0]?.output ?? null;
  const runResult = await executeMultiLangEngine(
    code,
    language,
    runInput,
    5000,
    runExpected,
  );

  const validation = await validateMultiLang(
    code,
    language,
    resolved.testcases,
  );
  const autoSubmitted = Boolean(validation.passed);

  if (autoSubmitted && userId) {
    await markQuestionSolvedForUser(userId, resolved.question.id);
  }

  return res.json({
    ...runResult,
    checked: true,
    questionId: resolved.question.id,
    questionTitle: resolved.question.title,
    testcaseSource: resolved.source,
    checkWarning: resolved.warning || null,
    correct: validation.passed,
    autoSubmitted,
    validation,
  });
});

app.post("/api/code/submit", async (req, res) => {
  const {
    code,
    questionId,
    userId,
    language = "javascript",
    questionContext,
  } = req.body;
  const resolved = resolveQuestionCheck(questionId, questionContext);

  if (!resolved.ok) {
    return res.json({ success: false, error: resolved.error });
  }

  const validation = await validateMultiLang(
    code,
    language,
    resolved.testcases,
  );

  if (validation.passed && userId) {
    await markQuestionSolvedForUser(userId, resolved.question.id);
  }

  res.json({
    success: true,
    questionId: resolved.question.id,
    questionTitle: resolved.question.title,
    testcaseSource: resolved.source,
    checkWarning: resolved.warning || null,
    ...validation,
  });
});

app.post("/api/ai/hints", aiHints);

app.post("/api/code/analyze", async (req, res) => {
  const { code, language, questionId, questionContext } = req.body;
  const resolved = resolveQuestionCheck(questionId, questionContext);

  if (!resolved.ok) {
    return res.json({ success: false, error: resolved.error });
  }

  const analysis = await analyzeCodeWithAI(
    code,
    language,
    resolved.question.title,
    resolved.question.description,
  );

  res.json(analysis);
});

// Health check with more info
app.get("/", (req, res) =>
  res.json({
    service: "NeuroLearn Backend",
    version: "2.0",
    status: "healthy",
    features: ["code-judge", "ai-tutor", "courses", "users"],
  }),
);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 4500;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 NeuroLearn Backend v2.0 running on port ${PORT}`);
  console.log(`📊 Rate limiting: 30/min AI, 100/min general`);
});
