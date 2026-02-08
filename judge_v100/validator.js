import { executeMultiLangEngine } from "./executor.js";

export async function validateMultiLang(code, language, testCases) {
  if (!testCases || testCases.length === 0) {
    return { passed: false, results: [], message: "No test cases provided." };
  }

  const results = [];
  let passedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const { input, output: expected } = testCases[i];
    try {
      const execution = await executeMultiLangEngine(
        code,
        language,
        input,
        5000,
        expected,
      );

      if (!execution.success) {
        results.push({
          testCase: i + 1,
          passed: false,
          error: execution.error,
          input: JSON.stringify(input),
          expected: JSON.stringify(expected),
        });
        continue;
      }

      let actual = execution.output;
      if (typeof actual === "string") {
        const trimmed = actual.trim();
        try {
          actual = JSON.parse(trimmed);
        } catch (e) {
          // Keep as raw string when output is not JSON.
          actual = trimmed;
        }
      }

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
      results.push({
        testCase: i + 1,
        passed: false,
        error: err.message,
      });
    }
  }

  const allPassed = passedCount === testCases.length;
  return {
    passed: allPassed,
    results,
    passedCount,
    totalCount: testCases.length,
    message: allPassed
      ? "✅ All test cases passed!"
      : `❌ ${passedCount}/${testCases.length} test cases passed.`,
  };
}
