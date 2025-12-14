import fs from "fs";
import { judgeQuestions } from "../questionsJudgeData.js";
import { execCmd } from "./exec.js";
import { wrapJS } from "./wrappers/js.js";
import { wrapPy } from "./wrappers/py.js";
import { wrapCpp } from "./wrappers/cpp.js";
import { wrapJava } from "./wrappers/java.js";

export default async function run(req, res) {
  const { language, code, questionId } = req.body;

  if (!questionId) {
    return res.json({ ok: false, message: "questionId missing" });
  }

  // ✅ USE JUDGE DATA (OBJECT)
  const q = judgeQuestions[questionId];

  if (!q || !Array.isArray(q.testcases) || q.testcases.length === 0) {
    return res.json({
      ok: false,
      message: "Question not judge-enabled",
    });
  }

  const tc = q.testcases[0];
  let cmd;

  try {
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
      return res.json({ ok: false, message: "Unsupported language" });
    }

    const r = await execCmd(cmd);

    // 🚫 cleanup COMMENTED for debugging
    cleanup();

    if (!r.ok) {
      return res.json({
        ok: false,
        status: "compile_or_runtime_error",
        message: r.message,
      });
    }

    return res.json({ ok: true, output: r.output });

  } catch (e) {
    // 🚫 cleanup COMMENTED for debugging
    // cleanup();

    return res.json({
      ok: false,
      message: e.message || "Unknown error",
    });
  }
}

// ---------------- CLEANUP (DISABLED TEMPORARILY) ----------------
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
