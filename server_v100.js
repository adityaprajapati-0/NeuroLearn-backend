import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import { questions } from "./questionsData.js";
import { query } from "./db.js";
import { executeMultiLangEngine } from "./judge_v100/executor.js";
import { validateMultiLang } from "./judge_v100/validator.js";
import { analyzeCodeWithAI } from "./judge_v100/aiJudge.js";
import { resolveQuestionCheck } from "./judge_v99/questionCheckTool.js";
import userRoutes from "./routes/userRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import tutorRoutes from "./routes/tutorRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST", "PATCH", "PUT", "DELETE"] },
});

app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Attach io to request for routes to use
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/tutor", tutorRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/ai", aiRoutes);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Socket.IO Logic
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on("leave_room", (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} left room ${room}`);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

async function markQuestionSolvedForUser(userId, questionId) {
  try {
    const userRes = await query("SELECT solved_ids FROM users WHERE id = $1", [
      userId,
    ]);

    if (userRes.rows.length === 0) return;

    const solvedIds = userRes.rows[0].solved_ids || [];
    if (solvedIds.includes(Number(questionId))) return;

    await query("UPDATE users SET solved_ids = $1 WHERE id = $2", [
      [...solvedIds, Number(questionId)],
      userId,
    ]);
  } catch (err) {
    console.error("Database update error:", err);
  }
}

// API Endpoints
app.post("/api/code/run", async (req, res) => {
  console.log("-> /api/code/run request received"); // DEBUG
  try {
    const {
      code,
      language = "javascript",
      questionId,
      questionContext,
      userId,
    } = req.body;

    if (!code) return res.json({ success: false, error: "No code provided." });

    if (!questionId) {
      const result = await executeMultiLangEngine(code, language);
      console.log(
        "<- /api/code/run responding (no questionId):",
        result?.success,
      ); // DEBUG
      return res.json({ ...result, checked: false, autoSubmitted: false });
    }

    const resolved = resolveQuestionCheck(questionId, questionContext);
    if (!resolved.ok) {
      const result = await executeMultiLangEngine(code, language);
      return res.json({
        ...result,
        checked: false,
        autoSubmitted: false,
        checkError: resolved.error,
      });
    }

    const runInput = resolved.testcases[0]?.input ?? null;
    const runExpected = resolved.testcases[0]?.output ?? null;
    const result = await executeMultiLangEngine(
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

    console.log("<- /api/code/run responding (final):", validation?.passed); // DEBUG
    res.json({
      ...result,
      checked: true,
      questionId: resolved.question.id,
      questionTitle: resolved.question.title,
      testcaseSource: resolved.source,
      checkWarning: resolved.warning || null,
      correct: validation.passed,
      autoSubmitted,
      validation,
    });
  } catch (err) {
    console.error("CRITICAL ERROR in /api/code/run:", err);
    res
      .status(500)
      .json({ success: false, error: "Internal Server Error: " + err.message });
  }
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

app.post("/api/code/analyze", async (req, res) => {
  const { code, language, questionId } = req.body;
  const question = questions.find((q) => q.id === Number(questionId));

  if (!question) {
    return res.json({ success: false, error: "Question not found." });
  }

  const analysis = await analyzeCodeWithAI(
    code,
    language,
    question.title || "Code Analysis",
    question.description ||
      "Analyze the provided code for correctness and efficiency.",
  );
  res.json(analysis);
});

app.get("/", (req, res) => res.send("✅ NeuroLearn Judge v100 is Active"));

const PORT = 4500;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Judge Backend v100 running on port ${PORT}`);
});
