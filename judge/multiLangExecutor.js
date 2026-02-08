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

  // Simple wrapper if not using a custom main
  if (!code.includes("int main")) {
    let inputDecls = "";
    let callArgs = "";

    if (Array.isArray(input)) {
      input.forEach((arg, idx) => {
        if (Array.isArray(arg)) {
          // Detect if it's a 2D array
          if (arg.length > 0 && Array.isArray(arg[0])) {
            inputDecls += `std::vector<std::vector<int>> arg${idx} = {${arg.map((r) => `{${r.join(",")}}`).join(",")}};\n    `;
          } else {
            // Vector input (1D)
            inputDecls += `std::vector<int> arg${idx} = {${arg.join(",")}};\n    `;
          }
        } else {
          // Integer input
          inputDecls += `int arg${idx} = ${arg};\n    `;
        }
        callArgs += (idx > 0 ? ", " : "") + `arg${idx}`;
      });
    }

    finalCode += `\n#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n    ${inputDecls}\n    auto res = solve(${callArgs});\n    cout << "[";\n    for(size_t i=0; i<res.size(); ++i) cout << res[i] << (i==res.size()-1 ? "" : ",");\n    cout << "]" << endl;\n    return 0;\n}`;
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

    let inputDecls = "";
    let callArgs = "";

    if (Array.isArray(input)) {
      input.forEach((arg, idx) => {
        if (Array.isArray(arg)) {
          // Java Array input (assuming int[] for now based on Two Sum)
          inputDecls += `int[] arg${idx} = {${arg.join(",")}};\n        `;
        } else {
          // Integer input
          inputDecls += `int arg${idx} = ${arg};\n        `;
        }
        callArgs += (idx > 0 ? ", " : "") + `arg${idx}`;
      });
    }

    finalCode += `\n    public static void main(String[] args) {\n        ${inputDecls}\n        int[] res = solve(${callArgs});\n        System.out.print("[");\n        for(int i=0; i<res.length; i++) System.out.print(res[i] + (i==res.length-1 ? "" : ","));\n        System.out.println("]");\n    }\n}`;
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
    let inputDecls = "";
    let callArgs = "";

    if (Array.isArray(input)) {
      input.forEach((arg, idx) => {
        if (Array.isArray(arg)) {
          // C Array input (assuming int[] for now)
          inputDecls += `int arg${idx}[] = {${arg.join(",")}};\n    `;
          // For C, we might need to pass size for arrays, but TwoSum usually implies explicit size or just pointer
          // The original code passed `input[0].length` as the second argument which is array size.
          // Let's assume standard Two Sum signature: int* twoSum(int* nums, int numsSize, int target, int* returnSize)
          // But here the user error showed `solve(vector<int>&, int)`.
          // For C, typical signature is `int* solve(int* nums, int numsSize, int target, int* returnSize)`
          // The previous code did: `solve(nums, length, target)`
          // We will try to match that pattern if an array is detected.
        } else {
          // Integer input
          inputDecls += `int arg${idx} = ${arg};\n    `;
        }
      });

      // Construct args for C specifically for LeetCode style C which often needs size
      // If strict signature `int* solve(int* nums, int numsSize, int target, int* returnSize)`
      // We might need to adjust. For now, let's replicate the dynamic approach but add size for arrays.
      input.forEach((arg, idx) => {
        if (Array.isArray(arg)) {
          callArgs += (idx > 0 ? ", " : "") + `arg${idx}, ${arg.length}`;
        } else {
          callArgs += (idx > 0 ? ", " : "") + `arg${idx}`;
        }
      });
    }

    // Note: C return style is tricky (often out param or malloc).
    // The original code assumed `int* res = solve(...)` and printed 2 elements.
    // We will keep it simple and consistent with the previous logic but dynamic.

    finalCode += `\n#include <stdio.h>\n#include <stdlib.h>\nint main() {\n    ${inputDecls}\n    int returnSize;\n    // Assuming signature: int* solve(int* nums, int numsSize, int target, int* returnSize)\n    // Or if simple: int* solve(int* nums, int numsSize, int target)\n    // The error log was C++, so C might be different. \n    // Let's stick to the previous pattern: solve(nums, size, target) based on old code.\n    
    int* res = solve(${callArgs});\n    printf("[ %d, %d ]\\n", res[0], res[1]);\n    // free(res); // depends if callee mallocs\n    return 0;\n}`;
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
