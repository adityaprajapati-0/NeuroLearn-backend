export const QUESTION_TESTS = {
  1: {
    input: [[2, 7, 11, 15], 9],
    output: [0, 1],
    tests: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] },
    ],
  },

  // Missing IDs from questionsJudgeData.js are defined here to keep all 100 IDs judgeable.
  12: {
    input: ["cbbd"],
    output: "bb",
    tests: [
      { input: ["cbbd"], expected: "bb" },
      { input: ["a"], expected: "a" },
    ],
  },

  16: {
    input: [[1, 2, 3, 4, 5]],
    output: [5, 4, 3, 2, 1],
    tests: [
      { input: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
      { input: [[1]], expected: [1] },
    ],
  },

  36: {
    input: [[1, 2, 3]],
    output: [3, 2, 1],
    tests: [
      { input: [[1, 2, 3]], expected: [3, 2, 1] },
      { input: [[1]], expected: [1] },
    ],
  },

  37: {
    input: [[3, 2, 0, -4], 1],
    output: 2,
    tests: [
      { input: [[3, 2, 0, -4], 1], expected: 2 },
      { input: [[1, 2], -1], expected: null },
    ],
  },

  39: {
    input: [[1, 2, 3, 4, 5]],
    output: [3, 3],
    tests: [
      { input: [[1, 2, 3, 4, 5]], expected: [3, 3] },
      { input: [[1]], expected: [0, 1] },
    ],
  },

  56: {
    input: [[1, 2, 3, 4, 5], 2, 4],
    output: [1, 4, 3, 2, 5],
    tests: [
      { input: [[1, 2, 3, 4, 5], 2, 4], expected: [1, 4, 3, 2, 5] },
      { input: [[1], 1, 1], expected: [1] },
    ],
  },

  76: {
    input: [[1, 2, 3, 4, 5], 2],
    output: [2, 1, 4, 3, 5],
    tests: [
      { input: [[1, 2, 3, 4, 5], 2], expected: [2, 1, 4, 3, 5] },
      { input: [[1], 1], expected: [1] },
    ],
  },

  77: {
    input: [[1, 2, 3, 4], 1],
    output: [1, 2, 3, 4],
    tests: [
      { input: [[1, 2, 3, 4], 1], expected: [1, 2, 3, 4] },
      { input: [[1], -1], expected: [1] },
    ],
  },

  96: {
    input: [[1, 2, 3, 4]],
    output: [2, 1, 4, 3],
    tests: [
      { input: [[1, 2, 3, 4]], expected: [2, 1, 4, 3] },
      { input: [[1]], expected: [1] },
    ],
  },
};
