import fs from "fs";
import { judgeQuestions } from "../questionsJudgeData.js";
import { execCmd } from "./exec.js";
import { wrapJS } from "./wrappers/js.js";

export default async function run(req, res) {
  try {
    const { language, code, questionId } = req.body;

    /* ---------- BASIC VALIDATION ---------- */
    if (!language || !code) {
      return res.json({
        ok: false,
        message: "language or code missing",
      });
    }

    if (!questionId) {
      return res.json({
        ok: false,
        message: "questionId missing",
      });
    }

    /* ---------- ONLY JS ALLOWED ON RENDER ---------- */
    if (language !== "javascript") {
      return res.json({
        ok: false,
        message:
          "Only JavaScript is supported on cloud judge right now (C++ / Java / Python disabled)",
      });
    }

    /* ---------- FETCH QUESTION ---------- */
    const q = judgeQuestions[questionId];

    if (!q || !Array.isArray(q.testcases) || q.testcases.length === 0) {
      return res.json({
        ok: false,
        message: "Question not judge-enabled",
      });
    }

    const tc = q.testcases[0];

    /* ---------- WRITE TEMP FILE ---------- */
    const FILE = "temp.js";
    fs.writeFileSync(FILE, wrapJS(code, tc.input));

    /* ---------- EXECUTE ---------- */
    const result = await execCmd(`node ${FILE}`);

    /* ---------- CLEANUP (SAFE) ---------- */
    try {
      if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
    } catch (_) {
      // ignore cleanup errors on Render
    }

    if (!result.ok) {
      return res.json({
        ok: false,
        status: "runtime_error",
        message: result.message || "Execution failed",
      });
    }

    return res.json({
      ok: true,
      output: result.output,
    });
  } catch (err) {
    console.error("🔥 RUN ERROR:", err);

    return res.status(500).json({
      ok: false,
      message: "Internal judge error",
    });
  }
}
