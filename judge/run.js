import fs from "fs/promises";
import { existsSync } from "fs";
import { questions } from "../questionsData.js";
import { execCmd } from "./exec.js";
import { wrapJS } from "./wrappers/js.js";
import { wrapPy } from "./wrappers/py.js";
import { wrapCpp } from "./wrappers/cpp.js";
import { wrapJava } from "./wrappers/java.js";
import { wrapC } from "./wrappers/c.js";

export default async function run(req, res) {
  const { language, code, questionId } = req.body;
  console.log(
    `[DEBUG] Judge Run: language="${language}", questionId="${questionId}"`,
  );

  // ---------------- SAFETY CHECKS ----------------
  if (!questionId) {
    return res.json({
      ok: false,
      message: "questionId missing in request",
    });
  }

  const q = questions.find((q) => String(q.id) === String(questionId));

  if (!q) {
    return res.json({
      ok: false,
      message: "Question not found or not judge-enabled",
    });
  }

  if (!Array.isArray(q.testcases) || q.testcases.length === 0) {
    return res.json({
      ok: false,
      message: "No testcases found for this question",
    });
  }

  // Run = first testcase only
  const tc = q.testcases[0];
  let cmd;

  try {
    // ---------------- LANGUAGE HANDLING (ASYNC) ----------------
    if (language === "javascript") {
      await fs.writeFile("temp.js", wrapJS(code, tc.input));
      cmd = "node temp.js";
    } else if (language === "python") {
      await fs.writeFile("temp.py", wrapPy(code, tc.input));
      cmd = "python temp.py";
    } else if (language === "cpp") {
      await fs.writeFile("temp.cpp", wrapCpp(code, tc.input));

      // ✅ WINDOWS FIX HERE
      const exe = process.platform === "win32" ? "temp.exe" : "temp";
      const runExe = process.platform === "win32" ? "temp.exe" : "./temp";

      cmd = `g++ temp.cpp -o ${exe} && ${runExe}`;
    } else if (language === "java") {
      await fs.writeFile("Main.java", wrapJava(code, tc.input));
      cmd = "javac Main.java && java Main";
    } else if (language === "c") {
      await fs.writeFile("temp.c", wrapC(code, tc.input));
      const exe = process.platform === "win32" ? "temp.exe" : "temp";
      const runExe = process.platform === "win32" ? "temp.exe" : "./temp";
      cmd = `gcc temp.c -o ${exe} && ${runExe}`;
    } else {
      return res.json({
        ok: false,
        message: "Unsupported language",
      });
    }

    // ---------------- EXECUTE ----------------
    const r = await execCmd(cmd);
    await cleanup();

    if (!r.ok) {
      return res.json({
        ok: false,
        status: "compile_or_runtime_error",
        message: r.message,
      });
    }

    return res.json({
      ok: true,
      output: r.output,
    });
  } catch (e) {
    await cleanup();
    return res.json({
      ok: false,
      message: e.message || "Unknown judge error",
    });
  }
}

// ---------------- ASYNC CLEANUP ----------------
async function cleanup() {
  const files = [
    "temp.js",
    "temp.py",
    "temp.cpp",
    "temp.c",
    "temp",
    "temp.exe",
    "Main.java",
    "Main.class",
  ];

  await Promise.all(
    files.map(async (f) => {
      if (existsSync(f)) {
        await fs.unlink(f);
      }
    }),
  );
}
