import { executeMultiLangEngine } from "./multiLangExecutor.js";

export async function validateMultiLang(code, language, testCases) {
  if (!testCases || testCases.length === 0)
    return { passed: false, results: [], message: "No test cases" };
  const results = [];
  let passedCount = 0;
  for (let i = 0; i < testCases.length; i++) {
    const { input, output: expected } = testCases[i];
    try {
      const exec = await executeMultiLangEngine(code, language, input);
      if (!exec.success) {
        results.push({ testCase: i + 1, passed: false, error: exec.error });
        continue;
      }
      let actual = exec.output;
      try {
        if (typeof actual === "string") actual = JSON.parse(actual);
      } catch {}
      const passed = JSON.stringify(actual) === JSON.stringify(expected);
      if (passed) passedCount++;
      results.push({
        testCase: i + 1,
        passed,
        input: JSON.stringify(input),
        expected: JSON.stringify(expected),
        actual: JSON.stringify(actual),
      });
    } catch (err) {
      results.push({ testCase: i + 1, passed: false, error: err.message });
    }
  }
  const allPassed = passedCount === testCases.length;
  return {
    passed: allPassed,
    results,
    passedCount,
    totalCount: testCases.length,
    message: allPassed
      ? "✅ All passed!"
      : `❌ ${passedCount}/${testCases.length} passed`,
  };
}
