import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import { questions } from "./questionsData.js";
import userRoutes from "./routes/userRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import { query } from "./db.js";
import aiHints from "./judge/aiHints.js";
import { executeMultiLangEngine } from "./final_executor.js";
import { validateMultiLang } from "./final_validator.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);

app.post("/api/code/run", async (req, res) => {
  const { code, language = "javascript" } = req.body;
  if (!code) return res.json({ success: false, error: "No code" });
  res.json(await executeMultiLangEngine(code, language));
});

app.post("/api/code/submit", async (req, res) => {
  const { code, questionId, userId, language = "javascript" } = req.body;
  const q = questions.find((x) => x.id === Number(questionId));
  if (!q) return res.json({ success: false, error: "No question" });
  const val = await validateMultiLang(code, language, q.testcases);
  if (val.passed && userId) {
    try {
      const u = await query("SELECT solved_ids FROM users WHERE id=$1", [
        userId,
      ]);
      if (u.rows.length > 0) {
        const s = u.rows[0].solved_ids || [];
        if (!s.includes(Number(questionId)))
          await query("UPDATE users SET solved_ids=$1 WHERE id=$2", [
            [...s, Number(questionId)],
            userId,
          ]);
      }
    } catch (e) {}
  }
  res.json({ success: true, ...val });
});
app.post("/api/ai/hints", aiHints);
app.get("/", (req, res) => res.send("OK FINAL"));
const PORT = 4500;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`PORT ${PORT}`);
});
