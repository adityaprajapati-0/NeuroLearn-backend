import fs from "fs";
import { questions } from "../frontend/src/questionsData.js";

// ✅ SAFE INPUT PARSER → RETURNS OBJECT
function parseInput(str) {
  // Expected: "nums = [1,2,3], target = 5"
  const obj = {};
  const parts = str.split(",");

  for (let part of parts) {
    const [key, value] = part.split("=").map(s => s.trim());
    if (!key || !value) continue;
    obj[key] = JSON.parse(value);
  }

  return obj;
}

// ✅ SAFE OUTPUT PARSER
function parseOutput(str) {
  return JSON.parse(str);
}

const judgeQuestions = {};

for (const q of questions) {
  if (!q.examples || q.examples.length === 0) continue;

  const testcases = [];

  for (const ex of q.examples) {
    try {
      const input = parseInput(ex.input);   // OBJECT ✅
      const output = parseOutput(ex.output);
      testcases.push({ input, output });
    } catch (e) {
      // skip unsupported formats
    }
  }

  if (testcases.length > 0) {
    judgeQuestions[q.id] = { testcases };
  }
}

fs.writeFileSync(
  "./questionsJudgeData.js",
  "export const judgeQuestions = " +
    JSON.stringify(judgeQuestions, null, 2)
);

console.log(
  "✅ Judge data generated for",
  Object.keys(judgeQuestions).length,
  "questions"
);
