import { executeMultiLangEngine } from "./multiLangExecutor.js";

export async function validateMultiLang(code, language, testCases) {
  if (!testCases || testCases.length === 0)
    return { passed: false, results: [], message: "No test cases" };
  const results = [];
  let passedCount = 0;
  for (let i = 0; i < testCases.length; i++) {
    const { input, output: expected } = testCases[i];
    try {
      // Ensure input is an array for multi-arg support in C++/Java/C
      // If input is an object {nums: [...], target: 9}, convert to values
      // If input is single value, wrap in array
      let normalizedInput = input;
      if (input && typeof input === "object" && !Array.isArray(input)) {
        normalizedInput = Object.values(input);
      } else if (!Array.isArray(input)) {
        normalizedInput = [input];
      }

      const exec = await executeMultiLangEngine(
        code,
        language,
        normalizedInput,
      );
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
