import fs from "fs";
import { judgeQuestions } from "../questionsJudgeData.js";
import { execCmd } from "./exec.js";
import { wrapJS } from "./wrappers/js.js";

export default async function submit(req, res) {
  try {
    const { language, code, questionId } = req.body;

    /* ---------- VALIDATION ---------- */
    if (!questionId) {
      return res.json({
        ok: false,
        message: "questionId missing in request",
      });
    }

    if (language !== "javascript") {
      return res.json({
        ok: false,
        message:
          "Only JavaScript is supported on cloud judge right now",
      });
    }

    const q = judgeQuestions[questionId];

    if (!q || !Array.isArray(q.testcases) || q.testcases.length === 0) {
      return res.json({
        ok: false,
        message: "Question not judge-enabled",
      });
    }

    /* ---------- RUN ALL TESTCASES ---------- */
    for (const tc of q.testcases) {
      const FILE = "temp.js";
      fs.writeFileSync(FILE, wrapJS(code, tc.input));

      const r = await execCmd(`node ${FILE}`);

      // SAFE CLEANUP
      try {
        if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
      } catch {}

      if (!r.ok) {
        return res.json({
          ok: false,
          status: "runtime_error",
          message: r.message,
        });
      }

      let got;
      try {
        got = JSON.parse(r.output);
      } catch {
        return res.json({
          ok: false,
          status: "runtime_error",
          message: "Output is not valid JSON",
        });
      }

      const passed =
        JSON.stringify(got) === JSON.stringify(tc.output);

      if (!passed) {
        return res.json({
          ok: true,
          status: "wrong",
          passed: false,
          failedTest: {
            input: tc.input,
            expected: tc.output,
            got,
          },
        });
      }
    }

    /* ---------- ALL PASSED ---------- */
    return res.json({
      ok: true,
      status: "correct",
      passed: true,
    });
  } catch (err) {
    console.error("🔥 SUBMIT ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: "Internal judge error",
    });
  }
}
