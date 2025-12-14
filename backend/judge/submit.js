import fs from "fs";
import { judgeQuestions } from "../questionsJudgeData.js";
import { execCmd } from "./exec.js";
import { wrapJS } from "./wrappers/js.js";
import { wrapPy } from "./wrappers/py.js";
import { wrapCpp } from "./wrappers/cpp.js";
import { wrapJava } from "./wrappers/java.js";

export default async function submit(req, res) {
  const { language, code, questionId } = req.body;

  if (!questionId) {
    return res.json({ ok: false, message: "questionId missing in request" });
  }

  // ✅ USE JUDGE DATA (NOT FRONTEND QUESTIONS)
  const q = judgeQuestions[questionId];

  if (!q || !Array.isArray(q.testcases) || q.testcases.length === 0) {
    return res.json({
      ok: false,
      message: "Question not judge-enabled",
    });
  }

  try {
    // ---------------- RUN ALL TESTCASES ----------------
    for (const tc of q.testcases) {
      let cmd;

      if (language === "javascript") {
        fs.writeFileSync("temp.js", wrapJS(code, tc.input));
        cmd = "node temp.js";

      } else if (language === "python") {
        fs.writeFileSync("temp.py", wrapPy(code, tc.input));
        cmd = "python temp.py";

      } else if (language === "cpp") {
        fs.writeFileSync("temp.cpp", wrapCpp(code, tc.input));
        const exe = process.platform === "win32" ? "temp.exe" : "temp";
        const runExe = process.platform === "win32" ? "temp.exe" : "./temp";
        cmd = `g++ temp.cpp -o ${exe} && ${runExe}`;

      } else if (language === "java") {
        fs.writeFileSync("Main.java", wrapJava(code, tc.input));
        cmd = "javac Main.java && java Main";

      } else {
        cleanup();
        return res.json({ ok: false, message: "Unsupported language" });
      }

      const r = await execCmd(cmd);
      cleanup();

      if (!r.ok) {
        return res.json({
          ok: false,
          status: "compile_or_runtime_error",
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

    return res.json({
      ok: true,
      status: "correct",
      passed: true,
    });

  } catch (e) {
    cleanup();
    return res.json({
      ok: false,
      message: e.message || "Unknown judge error",
    });
  }
}

function cleanup() {
  [
    "temp.js",
    "temp.py",
    "temp.cpp",
    "temp",
    "temp.exe",
    "Main.java",
    "Main.class",
  ].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
}
