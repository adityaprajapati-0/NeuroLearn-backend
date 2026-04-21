// backend/judge/testValidator.js
import { executeWithInput } from "./codeExecutor.js";

/**
 * Validates user code against test cases
 * @param {string} code - User's code
 * @param {Array} testCases - Array of test cases with input and expected output
 * @returns {Promise<{passed: boolean, results: Array, passedCount: number, totalCount: number}>}
 */
export async function validateCode(code, testCases) {
  if (!testCases || testCases.length === 0) {
    return {
      passed: false,
      results: [],
      passedCount: 0,
      totalCount: 0,
      message: "No test cases available for this question",
    };
  }

  const results = [];
  let passedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const { input, output: expectedOutput } = testCase;

    try {
      const execution = await executeWithInput(code, input);

      if (!execution.success) {
        results.push({
          testCase: i + 1,
          passed: false,
          input: formatInput(input),
          expected: formatOutput(expectedOutput),
          actual: null,
          error: execution.error,
        });
        continue;
      }

      // Compare actual output with expected output
      const actualOutput = execution.output;
      const passed = compareOutputs(actualOutput, expectedOutput);

      if (passed) {
        passedCount++;
      }

      results.push({
        testCase: i + 1,
        passed: passed,
        input: formatInput(input),
        expected: formatOutput(expectedOutput),
        actual: formatOutput(actualOutput),
        error: null,
      });
    } catch (error) {
      results.push({
        testCase: i + 1,
        passed: false,
        input: formatInput(input),
        expected: formatOutput(expectedOutput),
        actual: null,
        error: error.message,
      });
    }
  }

  const allPassed = passedCount === testCases.length;

  return {
    passed: allPassed,
    results: results,
    passedCount: passedCount,
    totalCount: testCases.length,
    message: allPassed
      ? `✅ All ${testCases.length} test cases passed!`
      : `❌ ${passedCount}/${testCases.length} test cases passed`,
  };
}

/**
 * Compares actual output with expected output
 * Handles different data types and formats
 */
function compareOutputs(actual, expected) {
  // Handle null/undefined
  if (actual === null || actual === undefined) {
    return expected === null || expected === undefined;
  }

  // Direct comparison for primitives
  if (typeof actual !== "object" && typeof expected !== "object") {
    return actual === expected;
  }

  // Array comparison
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;

    // Sort arrays for comparison (handles cases where order doesn't matter)
    const sortedActual = [...actual].sort();
    const sortedExpected = [...expected].sort();

    for (let i = 0; i < sortedActual.length; i++) {
      if (!compareOutputs(sortedActual[i], sortedExpected[i])) {
        return false;
      }
    }
    return true;
  }

  // Object comparison
  if (typeof actual === "object" && typeof expected === "object") {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();

    if (actualKeys.length !== expectedKeys.length) return false;
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys))
      return false;

    for (const key of actualKeys) {
      if (!compareOutputs(actual[key], expected[key])) {
        return false;
      }
    }
    return true;
  }

  // Fallback to string comparison
  return JSON.stringify(actual) === JSON.stringify(expected);
}

/**
 * Format input for display
 */
function formatInput(input) {
  if (Array.isArray(input)) {
    return input.map((i) => JSON.stringify(i)).join(", ");
  }
  return JSON.stringify(input);
}

/**
 * Format output for display
 */
function formatOutput(output) {
  return JSON.stringify(output);
}
