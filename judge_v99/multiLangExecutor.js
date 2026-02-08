import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const execPromise = promisify(exec);
const TEMP_DIR = path.join(process.cwd(), "temp_exec");

async function ensureTempDir() {
  try { await fs.access(TEMP_DIR); } catch { await fs.mkdir(TEMP_DIR, { recursive: true }); }
}

export async function executeMultiLangEngine(code, language, input = null, timeout = 5000) {
  await ensureTempDir();
  const requestId = uuidv4();
  const workDir = path.join(TEMP_DIR, requestId);
  await fs.mkdir(workDir);

  try {
    switch (language) {
      case "javascript": return await runNode(code, input, timeout);
      case "python": return await runPython(code, workDir, input, timeout);
      case "cpp": return await runCpp(code, workDir, input, timeout);
      case "c": return await runC(code, workDir, input, timeout);
      case "java": return await runJava(code, workDir, input, timeout);
      default: throw new Error("Unsupported language: " + language);
    }
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    setTimeout(() => { fs.rm(workDir, { recursive: true, force: true }).catch(() => {}); }, 1000);
  }
}

async function runNode(code, input, timeout) {
  const inputStr = input ? JSON.stringify(input) : "null";
  const wrappedCode = `${code}\nasync function __run() {\n  try {\n    const input = ${inputStr};\n    const result = typeof solve !== 'undefined' ? (Array.isArray(input) ? await solve(...input) : await solve(input)) : null;\n    process.stdout.write(JSON.stringify({ result }));\n  } catch (e) { process.stderr.write(e.message); process.exit(1); }\n}\n__run();`;
  const jsFile = path.join(TEMP_DIR, \`\${uuidv4()}.js\`);
  await fs.writeFile(jsFile, wrappedCode);
  try {
    const { stdout, stderr } = await execPromise(\`node "\${jsFile}"\`, { timeout });
    const sIdx = stdout.lastIndexOf('{"result":');
    if (sIdx === -1) throw new Error("No JSON in output: " + stdout);
    return { success: true, output: JSON.parse(stdout.substring(sIdx, stdout.lastIndexOf('}') + 1)).result, error: stderr };
  } catch (err) { return { success: false, error: err.stderr || err.message }; }
  finally { await fs.unlink(jsFile).catch(() => {}); }
}

async function runPython(code, workDir, input, timeout) {
  const pyFile = path.join(workDir, "solution.py");
  const inputFile = path.join(workDir, "input.json");
  await fs.writeFile(inputFile, JSON.stringify(input || null));
  
  const wrappedCode = \`import json
import sys

\${code}

if __name__ == "__main__":
    try:
        with open("input.json", "r") as f:
            input_data = json.load(f)
        if isinstance(input_data, list):
            result = solve(*input_data)
        else:
            result = solve(input_data)
        sys.stdout.write(json.dumps({"result": result}))
    except Exception as e:
        sys.stderr.write(str(e))
        sys.exit(1)
  \`;
  await fs.writeFile(pyFile, wrappedCode);
  try {
    const { stdout, stderr } = await execPromise(\`python "\${pyFile}"\`, { timeout, cwd: workDir });
    const sIdx = stdout.lastIndexOf('{"result":');
    if (sIdx === -1) throw new Error("No JSON in output: " + stdout);
    return { success: true, output: JSON.parse(stdout.substring(sIdx, stdout.lastIndexOf('}') + 1)).result, error: stderr };
  } catch (err) { return { success: false, error: err.stderr || err.message }; }
}

async function runCpp(code, workDir, input, timeout) {
  const cppFile = path.join(workDir, "solution.cpp");
  const exeFile = path.join(workDir, "solution.exe");
  let finalCode = code;
  if (!code.includes("int main")) {
    const iStr = Array.isArray(input) ? input[0].join(",") : "";
    finalCode += \`
#include <iostream>
#include <vector>
int main() {
    std::vector<int> nums = {\${iStr}};
    std::vector<int> res = solve(nums, \${Array.isArray(input) ? input[1] : 0});
    std::cout << "[";
    for(size_t i=0; i<res.size(); ++i) std::cout << res[i] << (i==res.size()-1 ? "" : ",");
    std::cout << "]" << std::endl;
    return 0;
}
\`;
  }
  await fs.writeFile(cppFile, finalCode);
  try {
    await execPromise(\`g++ "\${cppFile}" -o "\${exeFile}"\`);
    const { stdout, stderr } = await execPromise(\`"\${exeFile}"\`, { timeout });
    return { success: true, output: stdout.trim(), error: stderr };
  } catch (err) { return { success: false, error: err.stderr || err.message }; }
}

async function runJava(code, workDir, input, timeout) {
  const javaFile = path.join(workDir, "Solution.java");
  let finalCode = code;
  if (!code.includes("public static void main")) {
    if (!code.includes("class Solution")) finalCode = \`import java.util.*;\nclass Solution {\n\${code}\n\`;
    const iStr = (Array.isArray(input) && Array.isArray(input[0])) ? input[0].join(",") : "";
    finalCode += \`
    public static void main(String[] args) {
        int[] nums = {\${iStr}};
        int[] res = solve(nums, \${Array.isArray(input) ? input[1] : 0});
        System.out.print("[");
        for(int i=0; i<res.length; i++) System.out.print(res[i] + (i==res.length-1 ? "" : ","));
        System.out.println("]");
    }
}
\`;
  }
  await fs.writeFile(javaFile, finalCode);
  try {
    await execPromise(\`javac "\${javaFile}"\`);
    const { stdout, stderr } = await execPromise(\`java -cp "\${workDir}" Solution\`, { timeout });
    return { success: true, output: stdout.trim(), error: stderr };
  } catch (err) { return { success: false, error: err.stderr || err.message }; }
}

async function runC(code, workDir, input, timeout) {
  const cFile = path.join(workDir, "solution.c");
  const exeFile = path.join(workDir, "solution.exe");
  let finalCode = code;
  if (!code.includes("int main")) {
    const iStr = (Array.isArray(input) && Array.isArray(input[0])) ? input[0].join(",") : "";
    finalCode += \`
#include <stdio.h>
#include <stdlib.h>
int main() {
    int nums[] = {\${iStr}};
    int* res = solve(nums, \${(Array.isArray(input) && Array.isArray(input[0])) ? input[0].length : 0}, \${Array.isArray(input) ? input[1] : 0});
    printf("[ %d, %d ]\\n", res[0], res[1]);
    free(res); return 0;
}
\`;
  }
  await fs.writeFile(cFile, finalCode);
  try {
    await execPromise(\`gcc "\${cFile}" -o "\${exeFile}"\`);
    const { stdout, stderr } = await execPromise(\`"\${exeFile}"\`, { timeout });
    return { success: true, output: stdout.trim(), error: stderr };
  } catch (err) { return { success: false, error: err.stderr || err.message }; }
}
