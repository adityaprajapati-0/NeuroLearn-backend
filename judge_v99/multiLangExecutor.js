import { executeMultiLangEngine as v100Execute } from "../judge_v100/executor.js";

/**
 * Legacy Proxy to v100 Judge Engine
 * Consolidates judge_v99 calls into the hardened v100 engine.
 */
export async function executeMultiLangEngine(
  code,
  language,
  input = null,
  timeout = 5000,
  expectedOutput = null,
) {
  return await v100Execute(code, language, input, timeout, expectedOutput);
}
