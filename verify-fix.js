import { validateMultiLang } from "./judge_v100/validator.js";
import { judgeQuestions } from "./questionsJudgeData.js";

async function runVerification() {
  console.log("--- STANDALONE VERIFICATION ---");

  const pythonCode = `def solve(nums, target):
    mapping = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in mapping:
            return [mapping[diff], i]
        mapping[n] = i
    return []`;

  const cppCode = `
#include <vector>
#include <unordered_map>
using namespace std;
vector<int> solve(vector<int>& nums, int target) {
    unordered_map<int, int> mapping;
    for (int i = 0; i < (int)nums.size(); i++) {
        int diff = target - nums[i];
        if (mapping.count(diff)) return {mapping[diff], i};
        mapping[nums[i]] = i;
    }
    return {};
}`;

  const languages = ["python", "cpp"];

  for (const lang of languages) {
    console.log(`\nTesting ${lang}...`);
    const q1 = judgeQuestions[1].testcases;
    const code = lang === "python" ? pythonCode : cppCode;

    const result = await validateMultiLang(code, lang, q1);
    console.log(`${lang} passed:`, result.passed);
    console.log(`${lang} results:`, JSON.stringify(result.results, null, 2));
  }
}

runVerification().catch((err) => console.error("CRITICAL ERROR:", err));
