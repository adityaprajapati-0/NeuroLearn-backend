import { validateMultiLang } from "./judge_v100/validator.js";

async function runVerification() {
  console.log("--- STANDALONE MATRIX VERIFICATION ---");

  const matrixCode = `
#include <vector>
using namespace std;
vector<int> solve(vector<vector<int>>& matrix) {
    if (matrix.empty()) return {};
    vector<int> res;
    for (auto& row : matrix) {
        for (int val : row) res.push_back(val);
    }
    return res;
}`;

  const testCases = [
    {
      input: [
        [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
      ],
      output: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
  ];

  console.log("Testing C++ Matrix...");
  const result = await validateMultiLang(matrixCode, "cpp", testCases);
  console.log("Result Passed:", result.passed);
  console.log("Details:", JSON.stringify(result, null, 2));

  if (!result.passed) {
    console.log("RAW OUTPUT:", result.results[0]?.actual);
  }
}

runVerification().catch((err) => console.error(err));
