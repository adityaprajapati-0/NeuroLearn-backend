// backend/buildJudgeData.js
import fs from "fs";
import { questions } from "../src/questionsData.js";

function parseInput(str) {
  const cleaned = str.replace(/[a-zA-Z_]+\s*=/g, "").trim();
  return eval(`[${cleaned}]`);
}

function parseOutput(str) {
  return eval(str);
}

const judgeQuestions = {};

for (const q of questions) {
  if (!q.examples || q.examples.length === 0) continue;

  const testcases = [];

  for (const ex of q.examples) {
    try {
      const input = parseInput(ex.input);
      const output = parseOutput(ex.output);
      testcases.push({ input, output });
    } catch (e) {
      // skip un-parseable (trees, lists etc for now)
    }
  }

  if (testcases.length > 0) {
    judgeQuestions[q.id] = { testcases };
  }
}

fs.writeFileSync(
  "./questionsJudgeData.js",
  "export const judgeQuestions = " + JSON.stringify(judgeQuestions, null, 2),
);

console.log(
  "✅ Judge data generated for",
  Object.keys(judgeQuestions).length,
  "questions",
);
