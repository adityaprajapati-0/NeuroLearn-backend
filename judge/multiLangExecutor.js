import { executeMultiLangEngine as v100Execute } from "../judge_v100/executor.js";

/**
 * Legacy Proxy to v100 Judge Engine
 * This ensures that ALL routes (Run/Submit) across different versions
 * use the same robust, hardened C++/Java/Python logic.
 */
export async function executeMultiLangEngine(
  code,
  language,
  input = null,
  timeout = 5000,
  expectedOutput = null,
) {
  console.log(
    `[Consolidated Judge] Proxying ${language} request to v100 engine...`,
  );
  return await v100Execute(code, language, input, timeout, expectedOutput);
}

// Support older named export if used
export { executeMultiLangEngine as func_982347 };
