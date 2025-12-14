export const judgeQuestions = {
  // ================= TWO SUM =================
  1: {
    testcases: [
      { input: [[2,7,11,15], 9], output: [0,1] },
      { input: [[3,2,4], 6], output: [1,2] },
      { input: [[3,3], 6], output: [0,1] }
    ]
  },

  21: {
    testcases: [
      { input: [[1,2,3,2,4], 5], output: [[0,3],[1,4]] }
    ]
  },

  // ================= MAX SUBARRAY =================
  2: {
    testcases: [
      { input: [[-2,1,-3,4,-1,2,1,-5,4]], output: 6 },
      { input: [[1]], output: 1 },
      { input: [[-1,-2,-3]], output: -1 }
    ]
  },

  // ================= STOCK =================
  3: {
    testcases: [
      { input: [[7,1,5,3,6,4]], output: 5 },
      { input: [[7,6,4,3,1]], output: 0 }
    ]
  },

  // ================= PRODUCT EXCEPT SELF =================
  4: {
    testcases: [
      { input: [[1,2,3,4]], output: [24,12,8,6] },
      { input: [[0,4,0]], output: [0,0,0] }
    ]
  },

  // ================= ROTATE ARRAY =================
  5: {
    testcases: [
      { input: [[1,2,3,4,5,6,7], 3], output: [5,6,7,1,2,3,4] }
    ]
  },

  // ================= VALID PALINDROME =================
  11: {
    testcases: [
      { input: ["A man, a plan, a canal: Panama"], output: true },
      { input: ["race a car"], output: false }
    ]
  },

  // ================= LONGEST SUBSTRING =================
  13: {
    testcases: [
      { input: ["abcabcbb"], output: 3 },
      { input: ["bbbbb"], output: 1 },
      { input: ["pwwkew"], output: 3 }
    ]
  },

  // ================= ANAGRAM =================
  14: {
    testcases: [
      { input: ["anagram", "nagaram"], output: true },
      { input: ["rat", "car"], output: false }
    ]
  },

  // ================= NUMBER OF ISLANDS =================
  20: {
    testcases: [
      {
        input: [
          [
            ["1","1","0","0"],
            ["1","1","0","0"],
            ["0","0","1","0"],
            ["0","0","0","1"]
          ]
        ],
        output: 3
      }
    ]
  }
};
