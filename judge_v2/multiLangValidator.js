import { func_982347 } from "./multiLangExecutor.js";
export async function validateMultiLang(code, language, testCases) {
  if (!testCases || testCases.length === 0)
    return { passed: false, results: [], message: "No test cases" };
  const res = [];
  let pCount = 0;
  for (let i = 0; i < testCases.length; i++) {
    const { input, output: exp } = testCases[i];
    try {
      const e = await func_982347(code, language, input);
      if (!e.success) {
        res.push({ testCase: i + 1, passed: false, error: e.error });
        continue;
      }
      let act = e.output;
      try {
        if (typeof act === "string") act = JSON.parse(act);
      } catch {}
      const p = JSON.stringify(act) === JSON.stringify(exp);
      if (p) pCount++;
      res.push({
        testCase: i + 1,
        passed: p,
        input: JSON.stringify(input),
        expected: JSON.stringify(exp),
        actual: JSON.stringify(act),
      });
    } catch (err) {
      res.push({ testCase: i + 1, passed: false, error: err.message });
    }
  }
  return {
    passed: pCount === testCases.length,
    results: res,
    passedCount: pCount,
    totalCount: testCases.length,
    message:
      pCount === testCases.length
        ? "✅ Passed!"
        : `❌ ${pCount}/${testCases.length} passed`,
  };
}
