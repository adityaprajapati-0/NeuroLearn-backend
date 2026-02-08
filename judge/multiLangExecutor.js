import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { executeRemote } from "./remoteExecutor.js";

const execPromise = promisify(exec);
const TEMP_DIR = path.join(process.cwd(), "temp_exec");

const USE_REMOTE_JUDGE = Boolean(
  process.env.RAPID_API_KEY &&
  process.env.RAPID_API_KEY !== "YOUR_REAL_RAPIDAPI_KEY",
);

async function ensureTempDir() {
  try {
    await fs.access(TEMP_DIR);
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
}

export async function executeMultiLangEngine(
  code,
  language,
  input = null,
  timeout = 5000,
) {
  if (USE_REMOTE_JUDGE && ["java", "cpp", "c"].includes(language)) {
    console.log(`📡 Using Remote Judge for ${language}`);
    return await executeRemote(code, language, input);
  }

  await ensureTempDir();
  const requestId = uuidv4();
  const workDir = path.join(TEMP_DIR, requestId);
  await fs.mkdir(workDir);

  try {
    switch (language) {
      case "javascript":
        return await runNode(code, input, timeout);
      case "python":
        // Render usually has Python, but we can fallback if needed.
        return await runPython(code, workDir, input, timeout);
      case "cpp":
        return await runCpp(code, workDir, input, timeout);
      case "c":
        return await runC(code, workDir, input, timeout);
      case "java":
        return await runJava(code, workDir, input, timeout);
      default:
        throw new Error(`Unsupported: ${language}`);
    }
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    setTimeout(() => {
      fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }, 1000);
  }
}

async function runNode(code, input, timeout) {
  const inputStr = input ? JSON.stringify(input) : "null";
  const wrappedCode = `${code}\nasync function __run() {\n  try {\n    const input = ${inputStr};\n    const result = typeof solve !== 'undefined' ? (Array.isArray(input) ? await solve(...input) : await solve(input)) : null;\n    process.stdout.write(JSON.stringify({ result }));\n  } catch (e) { process.stderr.write(e.message); process.exit(1); }\n}\n__run();`;
  const jsFile = path.join(TEMP_DIR, `${uuidv4()}.js`);
  await fs.writeFile(jsFile, wrappedCode);
  try {
    const { stdout, stderr } = await execPromise(`node "${jsFile}"`, {
      timeout,
    });
    const startIdx = stdout.lastIndexOf('{"result":');
    if (startIdx === -1) throw new Error(`No JSON: ${stdout}`);
    return {
      success: true,
      output: JSON.parse(
        stdout.substring(startIdx, stdout.lastIndexOf("}") + 1),
      ).result,
      error: stderr,
    };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  } finally {
    await fs.unlink(jsFile).catch(() => {});
  }
}

async function runPython(code, workDir, input, timeout) {
  const pyFile = path.join(workDir, "solution.py");
  const inputStr = input ? JSON.stringify(input) : "None";
  const wrappedCode = `import json\nimport sys\n${code}\nif __name__ == "__main__":\n    try:\n        input_data = json.loads('${inputStr}')\n        result = solve(*input_data) if isinstance(input_data, list) else solve(input_data)\n        sys.stdout.write(json.dumps({"result": result}))\n    except Exception as e:\n        sys.stderr.write(str(e))\n        sys.exit(1)`;
  await fs.writeFile(pyFile, wrappedCode);
  try {
    const { stdout, stderr } = await execPromise(`python "${pyFile}"`, {
      timeout,
    });
    const startIdx = stdout.lastIndexOf('{"result":');
    if (startIdx === -1) throw new Error(`No JSON: ${stdout}`);
    return {
      success: true,
      output: JSON.parse(
        stdout.substring(startIdx, stdout.lastIndexOf("}") + 1),
      ).result,
      error: stderr,
    };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  }
}

async function runCpp(code, workDir, input, timeout) {
  const cppFile = path.join(workDir, "solution.cpp");
  const exeFile = path.join(workDir, "solution.exe");
  let finalCode = code;
  if (!code.includes("int main")) {
    const inputStr = Array.isArray(input) ? input[0].join(",") : "";
    finalCode += `\n#include <iostream>\n#include <vector>\nint main() {\n    std::vector<int> nums = {${inputStr}};\n    std::vector<int> res = solve(nums, ${Array.isArray(input) ? input[1] : 0});\n    std::cout << "[";\n    for(size_t i=0; i<res.size(); ++i) std::cout << res[i] << (i==res.size()-1 ? "" : ",");\n    std::cout << "]" << std::endl;\n    return 0;\n}`;
  }
  await fs.writeFile(cppFile, finalCode);
  try {
    await execPromise(`g++ "${cppFile}" -o "${exeFile}"`);
    const { stdout, stderr } = await execPromise(`"${exeFile}"`, { timeout });
    return { success: true, output: stdout.trim(), error: stderr };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  }
}

async function runJava(code, workDir, input, timeout) {
  const javaFile = path.join(workDir, "Solution.java");
  let finalCode = code;
  if (!code.includes("public static void main")) {
    if (!code.includes("class Solution"))
      finalCode = `import java.util.*;\nclass Solution {\n${code}\n`;
    const inputStr = Array.isArray(input) ? input[0].join(",") : "";
    finalCode += `\n    public static void main(String[] args) {\n        int[] nums = {${inputStr}};\n        int[] res = solve(nums, ${Array.isArray(input) ? input[1] : 0});\n        System.out.print("[");\n        for(int i=0; i<res.length; i++) System.out.print(res[i] + (i==res.length-1 ? "" : ","));\n        System.out.println("]");\n    }\n}`;
  }
  await fs.writeFile(javaFile, finalCode);
  try {
    await execPromise(`javac "${javaFile}"`);
    const { stdout, stderr } = await execPromise(
      `java -cp "${workDir}" Solution`,
      { timeout },
    );
    return { success: true, output: stdout.trim(), error: stderr };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  }
}

async function runC(code, workDir, input, timeout) {
  const cFile = path.join(workDir, "solution.c");
  const exeFile = path.join(workDir, "solution.exe");
  let finalCode = code;
  if (!code.includes("int main")) {
    const inputStr = Array.isArray(input) ? input[0].join(",") : "";
    finalCode += `\n#include <stdio.h>\n#include <stdlib.h>\nint main() {\n    int nums[] = {${inputStr}};\n    int* res = solve(nums, ${Array.isArray(input) ? input[0].length : 0}, ${Array.isArray(input) ? input[1] : 0});\n    printf("[ %d, %d ]\\n", res[0], res[1]);\n    free(res); return 0;\n}`;
  }
  await fs.writeFile(cFile, finalCode);
  try {
    await execPromise(`gcc "${cFile}" -o "${exeFile}"`);
    const { stdout, stderr } = await execPromise(`"${exeFile}"`, { timeout });
    return { success: true, output: stdout.trim(), error: stderr };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  }
}
