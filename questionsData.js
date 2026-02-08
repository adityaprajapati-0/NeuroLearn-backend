// ---------------------------------------------------------------
// src/questionsData.js
// FULL FILE – PART 1 / 7
// ---------------------------------------------------------------

import { judgeQuestions } from "./questionsJudgeData.js";

// ===============================================================
// BASE QUESTION PATTERNS (20 BASE → 100 QUESTIONS)
// ===============================================================

const baseQuestions = [
  {
    topic: "Arrays",
    topicFull: "Arrays / Hashing",
    title: "Two Sum",
    difficulty: "Easy",
    templates: {
      cpp: `#include <vector>\nusing namespace std;\n\nvector<int> solve(vector<int>& nums, int target) {\n    // Code here\n    return {};\n}`,
      java: `import java.util.*;\nclass Solution {\n    public int[] solve(int[] nums, int target) {\n        return new int[]{};\n    }\n}`,
      c: `#include <stdlib.h>\nint* solve(int* nums, int numsSize, int target) {\n    int* res = (int*)malloc(2*sizeof(int));\n    return res;\n}`,
      javascript: `function solve(nums, target) {\n    return [];\n}`,
      python: `def solve(nums, target):\n    return []`,
    },
  },
  {
    topic: "Arrays",
    topicFull: "Arrays / DP",
    title: "Maximum Subarray",
    difficulty: "Medium",
  },
  {
    topic: "Arrays",
    topicFull: "Arrays / Greedy",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
  },
  {
    topic: "Arrays",
    topicFull: "Arrays / Prefix Product",
    title: "Product of Array Except Self",
    difficulty: "Medium",
  },
  {
    topic: "Arrays",
    topicFull: "Arrays / Rotation",
    title: "Rotate Array",
    difficulty: "Easy",
  },

  {
    topic: "Arrays",
    topicFull: "Intervals",
    title: "Merge Intervals",
    difficulty: "Medium",
  },
  {
    topic: "Arrays",
    topicFull: "Matrix",
    title: "Set Matrix Zeroes",
    difficulty: "Medium",
  },
  {
    topic: "Arrays",
    topicFull: "Binary Search",
    title: "Search in Rotated Sorted Array",
    difficulty: "Medium",
  },
  {
    topic: "Arrays",
    topicFull: "Voting Algorithm",
    title: "Majority Element",
    difficulty: "Easy",
  },
  {
    topic: "Arrays",
    topicFull: "Matrix",
    title: "Spiral Matrix",
    difficulty: "Medium",
  },

  {
    topic: "Strings",
    topicFull: "Two Pointers",
    title: "Valid Palindrome",
    difficulty: "Easy",
  },
  {
    topic: "Strings",
    topicFull: "DP",
    title: "Longest Palindromic Substring",
    difficulty: "Medium",
  },
  {
    topic: "Strings",
    topicFull: "Sliding Window",
    title: "Longest Substring Without Repeating",
    difficulty: "Medium",
  },
  {
    topic: "Strings",
    topicFull: "Hashing",
    title: "Valid Anagram",
    difficulty: "Easy",
  },
  {
    topic: "Strings",
    topicFull: "Hashing",
    title: "Group Anagrams",
    difficulty: "Medium",
  },

  {
    topic: "Linked List",
    topicFull: "Pointers",
    title: "Reverse Linked List",
    difficulty: "Easy",
  },
  {
    topic: "Linked List",
    topicFull: "Cycle Detection",
    title: "Linked List Cycle",
    difficulty: "Medium",
  },
  {
    topic: "Trees",
    topicFull: "BFS",
    title: "Binary Tree Level Order Traversal",
    difficulty: "Easy",
  },
  {
    topic: "Trees",
    topicFull: "DFS",
    title: "Diameter of Binary Tree",
    difficulty: "Medium",
  },
  {
    topic: "Graphs",
    topicFull: "DFS / BFS",
    title: "Number of Islands",
    difficulty: "Medium",
    templates: {
      cpp: `#include <vector>\nusing namespace std;\n\nint solve(vector<vector<int>>& grid) {\n    // Code here\n    return 0;\n}`,
      java: `class Solution {\n    public int solve(int[][] grid) {\n        return 0;\n    }\n}`,
      c: `int solve(int** grid, int gridRowSize, int gridColSize) {\n    return 0;\n}`,
      javascript: `function solve(grid) {\n    return 0;\n}`,
      python: `def solve(grid):\n    return 0`,
    },
  },
];

// ===============================================================
// QUESTION FORMAT STORE (ALL DETAILS + TESTCASES)
// ===============================================================

export const questionFormats = {};

// ===============================================================
// BUILD QUESTION (DO NOT TOUCH LOGIC)
// ===============================================================

function buildQuestion(base, id) {
  const override = questionFormats[id] || {};

  return {
    id,
    title: override.title || `${base.title} (Set ${id})`,
    topic: base.topic,
    topicFull: base.topicFull,
    difficulty: base.difficulty,

    description: override.description || "",
    constraints: override.constraints || [],
    examples: override.examples || [],
    testcases: override.testcases || [],
    templates: { ...base.templates, ...override.templates },

    inputFormat: override.inputFormat || "",
    outputFormat: override.outputFormat || "",
  };
}

// ===============================================================
// EXPORT 100 QUESTIONS (🔥 THIS FIXES YOUR IMPORT ERROR)
// ===============================================================

export const questions = Array.from({ length: 100 }, (_, i) => {
  const base = baseQuestions[i % baseQuestions.length];
  return buildQuestion(base, i + 1);
});
// ===============================================================
// QUESTION DETAILS (1 → 20)
// ===============================================================

Object.assign(questionFormats, {
  // -------------------- 1. TWO SUM --------------------
  1: {
    title: "Two Sum",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i], target <= 10^9",
      "Exactly one solution exists",
    ],
    examples: [{ input: { nums: [2, 7, 11, 15], target: 9 }, output: [0, 1] }],
    testcases: [
      { input: { nums: [2, 7, 11, 15], target: 9 }, output: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, output: [1, 2] },
      { input: { nums: [3, 3], target: 6 }, output: [0, 1] },
    ],
  },

  // -------------------- 2. MAXIMUM SUBARRAY --------------------
  2: {
    title: "Maximum Subarray",
    description:
      "Find the contiguous subarray with the largest sum and return its sum.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [{ input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, output: 6 }],
    testcases: [
      { input: { nums: [1] }, output: 1 },
      { input: { nums: [-1, -2, -3] }, output: -1 },
      { input: { nums: [5, -2, 3, 4] }, output: 10 },
    ],
  },

  // -------------------- 3. BEST TIME TO BUY & SELL STOCK --------------------
  3: {
    title: "Best Time to Buy and Sell Stock",
    description:
      "Return the maximum profit you can achieve from a single transaction.",
    constraints: ["1 <= prices.length <= 10^5"],
    examples: [{ input: { prices: [7, 1, 5, 3, 6, 4] }, output: 5 }],
    testcases: [
      { input: { prices: [7, 6, 4, 3, 1] }, output: 0 },
      { input: { prices: [1, 2, 3, 4, 5] }, output: 4 },
    ],
  },

  // -------------------- 4. PRODUCT OF ARRAY EXCEPT SELF --------------------
  4: {
    title: "Product of Array Except Self",
    description:
      "Return an array where answer[i] is the product of all elements except nums[i].",
    constraints: ["2 <= nums.length <= 10^5"],
    examples: [{ input: { nums: [1, 2, 3, 4] }, output: [24, 12, 8, 6] }],
    testcases: [
      { input: { nums: [1, 2, 3, 4] }, output: [24, 12, 8, 6] },
      { input: { nums: [0, 1, 2, 3] }, output: [6, 0, 0, 0] },
    ],
  },

  // -------------------- 5. ROTATE ARRAY --------------------
  5: {
    title: "Rotate Array",
    description: "Rotate the array to the right by k steps.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [
      {
        input: { nums: [1, 2, 3, 4, 5, 6, 7], k: 3 },
        output: [5, 6, 7, 1, 2, 3, 4],
      },
    ],
    testcases: [
      { input: { nums: [1, 2], k: 1 }, output: [2, 1] },
      { input: { nums: [1, 2, 3], k: 4 }, output: [3, 1, 2] },
    ],
  },

  // -------------------- 6. MERGE INTERVALS --------------------
  6: {
    title: "Merge Intervals",
    description: "Merge all overlapping intervals.",
    constraints: ["1 <= intervals.length <= 10^4"],
    examples: [
      {
        input: {
          intervals: [
            [1, 3],
            [2, 6],
            [8, 10],
          ],
        },
        output: [
          [1, 6],
          [8, 10],
        ],
      },
    ],
    testcases: [
      {
        input: {
          intervals: [
            [1, 4],
            [4, 5],
          ],
        },
        output: [[1, 5]],
      },
    ],
  },

  // -------------------- 7. SET MATRIX ZEROES --------------------
  7: {
    title: "Set Matrix Zeroes",
    description: "If an element is 0, set its entire row and column to 0.",
    constraints: ["1 <= m,n <= 200"],
    examples: [
      {
        input: {
          matrix: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1],
          ],
        },
        output: [
          [1, 0, 1],
          [0, 0, 0],
          [1, 0, 1],
        ],
      },
    ],
    testcases: [{ input: { matrix: [[0, 1]] }, output: [[0, 0]] }],
  },

  // -------------------- 8. SEARCH IN ROTATED SORTED ARRAY --------------------
  8: {
    title: "Search in Rotated Sorted Array",
    description: "Return index of target if present else -1.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [
      { input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 0 }, output: 4 },
    ],
    testcases: [{ input: { nums: [1], target: 0 }, output: -1 }],
  },

  // -------------------- 9. MAJORITY ELEMENT --------------------
  9: {
    title: "Majority Element",
    description: "Return the element that appears more than n/2 times.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [{ input: { nums: [3, 2, 3] }, output: 3 }],
    testcases: [{ input: { nums: [2, 2, 1, 1, 1, 2, 2] }, output: 2 }],
  },

  // -------------------- 10. SPIRAL MATRIX --------------------
  10: {
    title: "Spiral Matrix",
    description: "Return all elements of the matrix in spiral order.",
    constraints: ["1 <= m,n <= 200"],
    examples: [
      {
        input: {
          matrix: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
        },
        output: [1, 2, 3, 6, 9, 8, 7, 4, 5],
      },
    ],
    testcases: [{ input: { matrix: [[1]] }, output: [1] }],
  },

  // -------------------- 11–20 PLACEHOLDERS (DETAILS NEXT PART) --------------------
});
// ===============================================================
// QUESTION DETAILS (21 → 40)
// ===============================================================

Object.assign(questionFormats, {
  // -------------------- 21. REVERSE LINKED LIST --------------------
  21: {
    title: "Reverse Linked List",
    description:
      "Given the head of a singly linked list, reverse the list and return the new head.",
    constraints: ["0 <= list length <= 10^4"],
    examples: [{ input: { head: [1, 2, 3, 4, 5] }, output: [5, 4, 3, 2, 1] }],
    testcases: [
      { input: { head: [] }, output: [] },
      { input: { head: [1] }, output: [1] },
      { input: { head: [1, 2] }, output: [2, 1] },
    ],
  },

  // -------------------- 22. REVERSE LINKED LIST (RECURSIVE) --------------------
  22: {
    title: "Reverse Linked List (Recursive)",
    description: "Reverse a singly linked list using recursion.",
    constraints: ["0 <= list length <= 10^4"],
    examples: [{ input: { head: [1, 2, 3] }, output: [3, 2, 1] }],
    testcases: [
      { input: { head: [1] }, output: [1] },
      { input: { head: [1, 2, 3, 4] }, output: [4, 3, 2, 1] },
    ],
  },

  // -------------------- 23. LINKED LIST CYCLE --------------------
  23: {
    title: "Linked List Cycle",
    description: "Determine if the linked list has a cycle.",
    constraints: ["0 <= list length <= 10^4"],
    examples: [{ input: { head: [3, 2, 0, -4], pos: 1 }, output: true }],
    testcases: [
      { input: { head: [1, 2], pos: -1 }, output: false },
      { input: { head: [1], pos: -1 }, output: false },
    ],
  },

  // -------------------- 24. LINKED LIST CYCLE II --------------------
  24: {
    title: "Linked List Cycle II",
    description:
      "Return the node where the cycle begins. If there is no cycle, return null.",
    constraints: ["0 <= list length <= 10^4"],
    examples: [{ input: { head: [3, 2, 0, -4], pos: 1 }, output: 2 }],
    testcases: [
      { input: { head: [1, 2], pos: 0 }, output: 1 },
      { input: { head: [1], pos: -1 }, output: null },
    ],
  },

  // -------------------- 25. MERGE TWO SORTED LISTS --------------------
  25: {
    title: "Merge Two Sorted Lists",
    description:
      "Merge two sorted linked lists and return it as a sorted list.",
    constraints: ["0 <= list length <= 10^4"],
    examples: [
      { input: { l1: [1, 2, 4], l2: [1, 3, 4] }, output: [1, 1, 2, 3, 4, 4] },
    ],
    testcases: [
      { input: { l1: [], l2: [] }, output: [] },
      { input: { l1: [], l2: [0] }, output: [0] },
    ],
  },

  // -------------------- 26. BINARY TREE LEVEL ORDER TRAVERSAL --------------------
  26: {
    title: "Binary Tree Level Order Traversal",
    description: "Return the level order traversal of a binary tree.",
    constraints: ["0 <= number of nodes <= 10^4"],
    examples: [
      {
        input: { root: [3, 9, 20, null, null, 15, 7] },
        output: [[3], [9, 20], [15, 7]],
      },
    ],
    testcases: [
      { input: { root: [] }, output: [] },
      { input: { root: [1] }, output: [[1]] },
    ],
  },

  // -------------------- 27. BINARY TREE ZIGZAG LEVEL ORDER --------------------
  27: {
    title: "Binary Tree Zigzag Level Order Traversal",
    description: "Return zigzag level order traversal of a binary tree.",
    constraints: ["0 <= number of nodes <= 10^4"],
    examples: [
      {
        input: { root: [3, 9, 20, null, null, 15, 7] },
        output: [[3], [20, 9], [15, 7]],
      },
    ],
    testcases: [{ input: { root: [1] }, output: [[1]] }],
  },

  // -------------------- 28. MAXIMUM DEPTH OF BINARY TREE --------------------
  28: {
    title: "Maximum Depth of Binary Tree",
    description: "Return the maximum depth of a binary tree.",
    constraints: ["0 <= number of nodes <= 10^4"],
    examples: [{ input: { root: [3, 9, 20, null, null, 15, 7] }, output: 3 }],
    testcases: [
      { input: { root: [] }, output: 0 },
      { input: { root: [1, 2] }, output: 2 },
    ],
  },

  // -------------------- 29. DIAMETER OF BINARY TREE --------------------
  29: {
    title: "Diameter of Binary Tree",
    description: "Return the length of the diameter of the tree.",
    constraints: ["0 <= number of nodes <= 10^4"],
    examples: [{ input: { root: [1, 2, 3, 4, 5] }, output: 3 }],
    testcases: [
      { input: { root: [1, 2] }, output: 1 },
      { input: { root: [1] }, output: 0 },
    ],
  },

  // -------------------- 30. SAME TREE --------------------
  30: {
    title: "Same Tree",
    description: "Check whether two binary trees are the same.",
    constraints: ["0 <= number of nodes <= 10^4"],
    examples: [{ input: { p: [1, 2, 3], q: [1, 2, 3] }, output: true }],
    testcases: [{ input: { p: [1, 2], q: [1, null, 2] }, output: false }],
  },

  // -------------------- 31. INVERT BINARY TREE --------------------
  31: {
    title: "Invert Binary Tree",
    description: "Invert a binary tree.",
    constraints: ["0 <= number of nodes <= 10^4"],
    examples: [
      { input: { root: [4, 2, 7, 1, 3, 6, 9] }, output: [4, 7, 2, 9, 6, 3, 1] },
    ],
    testcases: [{ input: { root: [] }, output: [] }],
  },

  // -------------------- 32. SYMMETRIC TREE --------------------
  32: {
    title: "Symmetric Tree",
    description: "Check whether a binary tree is symmetric.",
    constraints: ["0 <= number of nodes <= 10^4"],
    examples: [{ input: { root: [1, 2, 2, 3, 4, 4, 3] }, output: true }],
    testcases: [
      { input: { root: [1, 2, 2, null, 3, null, 3] }, output: false },
    ],
  },

  // -------------------- 33. PATH SUM --------------------
  33: {
    title: "Path Sum",
    description: "Check if the tree has a root-to-leaf path with given sum.",
    constraints: ["0 <= number of nodes <= 10^4"],
    examples: [
      {
        input: {
          root: [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1],
          targetSum: 22,
        },
        output: true,
      },
    ],
    testcases: [{ input: { root: [], targetSum: 0 }, output: false }],
  },

  // -------------------- 34. NUMBER OF ISLANDS --------------------
  34: {
    title: "Number of Islands",
    description: "Return the number of islands in a 2D grid.",
    constraints: ["1 <= m,n <= 300"],
    examples: [
      {
        input: {
          grid: [
            ["1", "1", "0"],
            ["0", "1", "0"],
            ["1", "0", "1"],
          ],
        },
        output: 3,
      },
    ],
    testcases: [
      {
        input: {
          grid: [
            ["0", "0"],
            ["0", "0"],
          ],
        },
        output: 0,
      },
    ],
  },

  // -------------------- 35. MAX AREA OF ISLAND --------------------
  35: {
    title: "Max Area of Island",
    description: "Return the maximum area of an island.",
    constraints: ["1 <= m,n <= 50"],
    examples: [
      {
        input: {
          grid: [
            [0, 0, 1, 0],
            [1, 1, 1, 0],
            [0, 0, 1, 0],
          ],
        },
        output: 5,
      },
    ],
    testcases: [
      {
        input: {
          grid: [
            [0, 0],
            [0, 0],
          ],
        },
        output: 0,
      },
    ],
  },

  // -------------------- 36. FLOOD FILL --------------------
  36: {
    title: "Flood Fill",
    description: "Perform flood fill on an image.",
    constraints: ["1 <= m,n <= 50"],
    examples: [
      {
        input: {
          image: [
            [1, 1, 1],
            [1, 1, 0],
            [1, 0, 1],
          ],
          sr: 1,
          sc: 1,
          color: 2,
        },
        output: [
          [2, 2, 2],
          [2, 2, 0],
          [2, 0, 1],
        ],
      },
    ],
    testcases: [
      { input: { image: [[0]], sr: 0, sc: 0, color: 1 }, output: [[1]] },
    ],
  },

  // -------------------- 37. CLONE GRAPH --------------------
  37: {
    title: "Clone Graph",
    description: "Clone an undirected graph.",
    constraints: ["0 <= nodes <= 100"],
    examples: [
      {
        input: {
          adjList: [
            [2, 4],
            [1, 3],
            [2, 4],
            [1, 3],
          ],
        },
        output: [
          [2, 4],
          [1, 3],
          [2, 4],
          [1, 3],
        ],
      },
    ],
    testcases: [{ input: { adjList: [] }, output: [] }],
  },

  // -------------------- 38. COURSE SCHEDULE --------------------
  38: {
    title: "Course Schedule",
    description: "Determine if you can finish all courses.",
    constraints: ["1 <= numCourses <= 2000"],
    examples: [
      { input: { numCourses: 2, prerequisites: [[1, 0]] }, output: true },
    ],
    testcases: [
      {
        input: {
          numCourses: 2,
          prerequisites: [
            [1, 0],
            [0, 1],
          ],
        },
        output: false,
      },
    ],
  },

  // -------------------- 39. COURSE SCHEDULE II --------------------
  39: {
    title: "Course Schedule II",
    description: "Return an order of courses to finish all courses.",
    constraints: ["1 <= numCourses <= 2000"],
    examples: [
      { input: { numCourses: 2, prerequisites: [[1, 0]] }, output: [0, 1] },
    ],
    testcases: [{ input: { numCourses: 1, prerequisites: [] }, output: [0] }],
  },

  // -------------------- 40. WORD LADDER --------------------
  40: {
    title: "Word Ladder",
    description: "Return the length of the shortest transformation sequence.",
    constraints: ["1 <= wordList.length <= 5000"],
    examples: [
      {
        input: {
          beginWord: "hit",
          endWord: "cog",
          wordList: ["hot", "dot", "dog", "lot", "log", "cog"],
        },
        output: 5,
      },
    ],
    testcases: [
      {
        input: {
          beginWord: "hit",
          endWord: "cog",
          wordList: ["hot", "dot", "dog", "lot", "log"],
        },
        output: 0,
      },
    ],
  },
});
// ===============================================================
// QUESTION DETAILS (41 → 60)
// ===============================================================

Object.assign(questionFormats, {
  // -------------------- 41. TWO SUM III --------------------
  41: {
    title: "Two Sum III – Unique Value Pairs",
    description:
      "Return all unique pairs of values [x, y] such that x + y == target.",
    constraints: ["2 <= nums.length <= 10^4"],
    examples: [
      {
        input: { nums: [1, 1, 2, 2, 3, 4], target: 5 },
        output: [
          [1, 4],
          [2, 3],
        ],
      },
    ],
    testcases: [{ input: { nums: [2, 2, 3, 3], target: 5 }, output: [[2, 3]] }],
  },

  // -------------------- 42. MAXIMUM SUBARRAY INDICES --------------------
  42: {
    title: "Maximum Subarray – Indices",
    description:
      "Return starting and ending indices of subarray with maximum sum.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [
      { input: { nums: [-2, -3, 4, -1, -2, 1, 5, -3] }, output: [2, 6] },
    ],
    testcases: [{ input: { nums: [1] }, output: [0, 0] }],
  },

  // -------------------- 43. STOCK WITH COOLDOWN --------------------
  43: {
    title: "Best Time to Buy and Sell Stock – Cooldown",
    description: "After selling stock, you cannot buy on the next day.",
    constraints: ["1 <= prices.length <= 10^5"],
    examples: [{ input: { prices: [1, 2, 3, 0, 2] }, output: 3 }],
    testcases: [{ input: { prices: [1] }, output: 0 }],
  },

  // -------------------- 44. PRODUCT EXCEPT SELF (MOD) --------------------
  44: {
    title: "Product of Array Except Self – Modulo",
    description: "Return product except self under modulo.",
    constraints: ["2 <= nums.length <= 2*10^5"],
    examples: [
      {
        input: { nums: [1, 2, 3, 4], MOD: 1000000007 },
        output: [24, 12, 8, 6],
      },
    ],
    testcases: [{ input: { nums: [2, 3], MOD: 1000000007 }, output: [3, 2] }],
  },

  // -------------------- 45. ROTATE ARRAY IN-PLACE --------------------
  45: {
    title: "Rotate Array – In-place",
    description: "Rotate array using in-place reverse method.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [
      { input: { nums: [1, 2, 3, 4, 5, 6], k: 2 }, output: [5, 6, 1, 2, 3, 4] },
    ],
    testcases: [{ input: { nums: [1, 2, 3], k: 3 }, output: [1, 2, 3] }],
  },

  // -------------------- 46. INTERVAL LIST INTERSECTIONS --------------------
  46: {
    title: "Interval List Intersections",
    description: "Return intersections of two interval lists.",
    constraints: ["0 <= intervals <= 10^4"],
    examples: [
      {
        input: {
          A: [
            [0, 2],
            [5, 10],
            [13, 23],
            [24, 25],
          ],
          B: [
            [1, 5],
            [8, 12],
            [15, 24],
            [25, 26],
          ],
        },
        output: [
          [1, 2],
          [5, 5],
          [8, 10],
          [15, 23],
          [24, 24],
          [25, 25],
        ],
      },
    ],
    testcases: [{ input: { A: [], B: [] }, output: [] }],
  },

  // -------------------- 47. SET BORDER ZEROES --------------------
  47: {
    title: "Set Border Zeroes",
    description: "Set entire row and column zero if border cell is zero.",
    constraints: ["1 <= m,n <= 200"],
    examples: [
      {
        input: {
          matrix: [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
          ],
        },
        output: [
          [0, 0, 0],
          [0, 4, 5],
          [0, 7, 8],
        ],
      },
    ],
    testcases: [
      {
        input: {
          matrix: [
            [1, 2],
            [3, 4],
          ],
        },
        output: [
          [1, 2],
          [3, 4],
        ],
      },
    ],
  },

  // -------------------- 48. FIND MIN IN ROTATED ARRAY --------------------
  48: {
    title: "Find Minimum in Rotated Sorted Array",
    description: "Return the minimum element.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [{ input: { nums: [3, 4, 5, 1, 2] }, output: 1 }],
    testcases: [{ input: { nums: [1] }, output: 1 }],
  },

  // -------------------- 49. CHECK MAJORITY ELEMENT --------------------
  49: {
    title: "Check for Majority Element",
    description: "Check whether x appears more than n/2 times.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [{ input: { nums: [1, 1, 2, 1, 3], x: 1 }, output: true }],
    testcases: [{ input: { nums: [1, 2, 3], x: 2 }, output: false }],
  },

  // -------------------- 50. SPIRAL MATRIX II --------------------
  50: {
    title: "Spiral Matrix II",
    description: "Generate an n x n spiral matrix.",
    constraints: ["1 <= n <= 20"],
    examples: [
      {
        input: { n: 3 },
        output: [
          [1, 2, 3],
          [8, 9, 4],
          [7, 6, 5],
        ],
      },
    ],
    testcases: [{ input: { n: 1 }, output: [[1]] }],
  },

  // -------------------- 51. VALID PALINDROME (LETTERS ONLY) --------------------
  51: {
    title: "Valid Palindrome – Letters Only",
    description: "Check palindrome considering only letters.",
    constraints: ["1 <= s.length <= 2*10^5"],
    examples: [{ input: { s: "nurses run!" }, output: true }],
    testcases: [{ input: { s: "hello" }, output: false }],
  },

  // -------------------- 52. LONGEST PALINDROMIC SUBSEQUENCE --------------------
  52: {
    title: "Longest Palindromic Subsequence",
    description: "Return length of longest palindromic subsequence.",
    constraints: ["1 <= s.length <= 1000"],
    examples: [{ input: { s: "bbbab" }, output: 4 }],
    testcases: [{ input: { s: "cbbd" }, output: 2 }],
  },

  // -------------------- 53. LONGEST SUBSTRING AT MOST K DISTINCT --------------------
  53: {
    title: "Longest Substring with At Most K Distinct Characters",
    description:
      "Return length of longest substring with at most k distinct characters.",
    constraints: ["1 <= s.length <= 10^5"],
    examples: [{ input: { s: "eceba", k: 2 }, output: 3 }],
    testcases: [{ input: { s: "aa", k: 1 }, output: 2 }],
  },

  // -------------------- 54. FIND ALL ANAGRAM INDICES --------------------
  54: {
    title: "Find All Anagram Indices",
    description: "Return all start indices of p's anagrams in s.",
    constraints: ["1 <= s.length <= 3*10^4"],
    examples: [{ input: { s: "cbaebabacd", p: "abc" }, output: [0, 6] }],
    testcases: [{ input: { s: "abab", p: "ab" }, output: [0, 1, 2] }],
  },

  // -------------------- 55. COUNT ANAGRAM GROUPS --------------------
  55: {
    title: "Count Anagram Groups",
    description: "Return number of distinct anagram groups.",
    constraints: ["1 <= strs.length <= 10^4"],
    examples: [
      { input: { strs: ["ab", "ba", "abc", "cab", "bca", "xyz"] }, output: 3 },
    ],
    testcases: [{ input: { strs: ["a"] }, output: 1 }],
  },

  // -------------------- 56. REVERSE LINKED LIST II --------------------
  56: {
    title: "Reverse Linked List II",
    description: "Reverse nodes between left and right.",
    constraints: ["1 <= left <= right <= list length"],
    examples: [
      {
        input: { head: [1, 2, 3, 4, 5], left: 2, right: 4 },
        output: [1, 4, 3, 2, 5],
      },
    ],
    testcases: [{ input: { head: [1], left: 1, right: 1 }, output: [1] }],
  },

  // -------------------- 57. CYCLE LENGTH --------------------
  57: {
    title: "Cycle Length in Linked List",
    description: "Return length of cycle if exists.",
    constraints: ["0 <= list length <= 10^4"],
    examples: [{ input: { head: [1, 2, 3, 4, 5], pos: 2 }, output: 3 }],
    testcases: [{ input: { head: [1, 2], pos: -1 }, output: 0 }],
  },

  // -------------------- 58. AVERAGE OF LEVELS --------------------
  58: {
    title: "Average of Levels in Binary Tree",
    description: "Return average value of nodes on each level.",
    constraints: ["0 <= nodes <= 10^4"],
    examples: [{ input: { root: [3, 9, 20, 15, 7] }, output: [3, 14.5, 11] }],
    testcases: [{ input: { root: [1] }, output: [1] }],
  },

  // -------------------- 59. DIAMETER (NODE COUNT) --------------------
  59: {
    title: "Diameter of Binary Tree – Node Count",
    description: "Return max number of nodes on any path.",
    constraints: ["0 <= nodes <= 10^4"],
    examples: [{ input: { root: [1, 2, 3, 4, 5] }, output: 4 }],
    testcases: [{ input: { root: [1] }, output: 1 }],
  },

  // -------------------- 60. CLOSED ISLANDS --------------------
  60: {
    title: "Number of Closed Islands",
    description: "Return number of closed islands.",
    constraints: ["1 <= m,n <= 100"],
    examples: [
      {
        input: {
          grid: [
            [1, 1, 1],
            [1, 0, 0],
            [1, 0, 0],
          ],
        },
        output: 1,
      },
    ],
    testcases: [
      {
        input: {
          grid: [
            [1, 1],
            [1, 1],
          ],
        },
        output: 0,
      },
    ],
  },
});
// ===============================================================
// QUESTION DETAILS (61 → 80)
// ===============================================================

Object.assign(questionFormats, {
  // -------------------- 61. TWO SUM IV (SORTED ARRAY) --------------------
  61: {
    title: "Two Sum IV – Input Array Is Sorted",
    description:
      "Given a sorted array, return 1-based indices of two numbers that add up to target.",
    constraints: ["2 <= numbers.length <= 10^5"],
    examples: [
      { input: { numbers: [2, 7, 11, 15], target: 9 }, output: [1, 2] },
    ],
    testcases: [
      { input: { numbers: [1, 2, 3, 4], target: 6 }, output: [2, 4] },
    ],
  },

  // -------------------- 62. MAXIMUM CIRCULAR SUBARRAY --------------------
  62: {
    title: "Maximum Circular Subarray Sum",
    description:
      "Return the maximum possible sum of a non-empty subarray in a circular array.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [{ input: { nums: [5, -3, 5] }, output: 10 }],
    testcases: [{ input: { nums: [-3, -2, -3] }, output: -2 }],
  },

  // -------------------- 63. STOCK WITH TRANSACTION FEE --------------------
  63: {
    title: "Best Time to Buy and Sell Stock – With Fee",
    description:
      "You may complete as many transactions as you like, but you pay a fee for each transaction.",
    constraints: ["1 <= prices.length <= 10^5"],
    examples: [{ input: { prices: [1, 3, 2, 8, 4, 9], fee: 2 }, output: 8 }],
    testcases: [{ input: { prices: [1, 1, 1], fee: 1 }, output: 0 }],
  },

  // -------------------- 64. PRODUCT OF SUBARRAY OF LENGTH K --------------------
  64: {
    title: "Product of Subarray of Length K",
    description: "Return the product of each contiguous subarray of size k.",
    constraints: ["1 <= k <= nums.length <= 10^5"],
    examples: [{ input: { nums: [1, 2, 3, 4], k: 2 }, output: [2, 6, 12] }],
    testcases: [{ input: { nums: [1, 1, 1], k: 2 }, output: [1, 1] }],
  },

  // -------------------- 65. ROTATE MATRIX --------------------
  65: {
    title: "Rotate Matrix by 90 Degrees",
    description: "Rotate an n x n matrix by 90 degrees clockwise.",
    constraints: ["1 <= n <= 200"],
    examples: [
      {
        input: {
          matrix: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
        },
        output: [
          [7, 4, 1],
          [8, 5, 2],
          [9, 6, 3],
        ],
      },
    ],
    testcases: [{ input: { matrix: [[1]] }, output: [[1]] }],
  },

  // -------------------- 66. NON-OVERLAPPING INTERVALS --------------------
  66: {
    title: "Non-overlapping Intervals",
    description:
      "Return the minimum number of intervals you need to remove to make the rest non-overlapping.",
    constraints: ["1 <= intervals.length <= 10^5"],
    examples: [
      {
        input: {
          intervals: [
            [1, 2],
            [2, 3],
            [3, 4],
            [1, 3],
          ],
        },
        output: 1,
      },
    ],
    testcases: [
      {
        input: {
          intervals: [
            [1, 2],
            [1, 2],
            [1, 2],
          ],
        },
        output: 2,
      },
    ],
  },

  // -------------------- 67. SET MATRIX ONES --------------------
  67: {
    title: "Set Matrix Ones from 1-cells",
    description: "If a cell is 1, set its entire row and column to 1.",
    constraints: ["1 <= m,n <= 200"],
    examples: [
      {
        input: {
          matrix: [
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 0],
          ],
        },
        output: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 1, 0],
        ],
      },
    ],
    testcases: [{ input: { matrix: [[0]] }, output: [[0]] }],
  },

  // -------------------- 68. SEARCH RANGE IN ROTATED ARRAY --------------------
  68: {
    title: "Search Range in Rotated Sorted Array",
    description: "Return starting and ending index of target in rotated array.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [
      {
        input: { nums: [4, 5, 6, 7, 0, 1, 2, 2, 2], target: 2 },
        output: [6, 8],
      },
    ],
    testcases: [{ input: { nums: [1], target: 1 }, output: [0, 0] }],
  },

  // -------------------- 69. MAJORITY ELEMENT (HASH MAP) --------------------
  69: {
    title: "Majority Element – Hash Map",
    description: "Find majority element using a hash map.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [{ input: { nums: [2, 2, 1, 1, 1, 2, 2] }, output: 2 }],
    testcases: [{ input: { nums: [1, 2, 3] }, output: -1 }],
  },

  // -------------------- 70. SPIRAL MATRIX K-th ELEMENT --------------------
  70: {
    title: "Spiral Matrix – K-th Element",
    description: "Return the k-th element in spiral order.",
    constraints: ["1 <= m,n <= 200"],
    examples: [
      {
        input: {
          matrix: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
          k: 4,
        },
        output: 6,
      },
    ],
    testcases: [{ input: { matrix: [[1]], k: 1 }, output: 1 }],
  },

  // -------------------- 71. VALID PALINDROME (CASE SENSITIVE) --------------------
  71: {
    title: "Valid Palindrome – Case Sensitive",
    description: "Check palindrome considering case and all characters.",
    constraints: ["1 <= s.length <= 10^5"],
    examples: [{ input: { s: "abBA" }, output: false }],
    testcases: [{ input: { s: "aa" }, output: true }],
  },

  // -------------------- 72. SHORTEST PALINDROME --------------------
  72: {
    title: "Shortest Palindrome",
    description:
      "Return the shortest palindrome by adding characters in front.",
    constraints: ["1 <= s.length <= 10^5"],
    examples: [{ input: { s: "aacecaaa" }, output: "aaacecaaa" }],
    testcases: [{ input: { s: "abcd" }, output: "dcbabcd" }],
  },

  // -------------------- 73. LONGEST REPEATING CHARACTER REPLACEMENT --------------------
  73: {
    title: "Longest Repeating Character Replacement",
    description: "Return longest substring after at most k replacements.",
    constraints: ["1 <= s.length <= 10^5"],
    examples: [{ input: { s: "ABAB", k: 2 }, output: 4 }],
    testcases: [{ input: { s: "AABABBA", k: 1 }, output: 4 }],
  },

  // -------------------- 74. GROUP TWO STRINGS BY ANAGRAM --------------------
  74: {
    title: "Group Two Strings by Anagram",
    description: "Determine for each string pair whether they are anagrams.",
    constraints: ["1 <= pairs.length <= 10^4"],
    examples: [
      {
        input: {
          pairs: [
            ["ab", "ba"],
            ["foo", "oof"],
            ["bar", "baz"],
          ],
        },
        output: [true, true, false],
      },
    ],
    testcases: [
      {
        input: {
          pairs: [
            ["a", "a"],
            ["a", "b"],
          ],
        },
        output: [true, false],
      },
    ],
  },

  // -------------------- 75. LARGEST ANAGRAM GROUP --------------------
  75: {
    title: "Largest Anagram Group Size",
    description: "Return size of largest anagram group.",
    constraints: ["1 <= strs.length <= 10^4"],
    examples: [
      { input: { strs: ["ab", "ba", "abc", "cab", "bca", "xyz"] }, output: 3 },
    ],
    testcases: [{ input: { strs: ["a"] }, output: 1 }],
  },

  // -------------------- 76. REVERSE NODES IN K-GROUP --------------------
  76: {
    title: "Reverse Nodes in k-Group",
    description: "Reverse nodes of linked list k at a time.",
    constraints: ["1 <= list length <= 10^4"],
    examples: [
      { input: { head: [1, 2, 3, 4, 5], k: 2 }, output: [2, 1, 4, 3, 5] },
    ],
    testcases: [{ input: { head: [1], k: 1 }, output: [1] }],
  },

  // -------------------- 77. REMOVE CYCLE FROM LINKED LIST --------------------
  77: {
    title: "Remove Cycle from Linked List",
    description: "If cycle exists, remove it and return the list.",
    constraints: ["0 <= list length <= 10^4"],
    examples: [{ input: { head: [1, 2, 3, 4], pos: 1 }, output: [1, 2, 3, 4] }],
    testcases: [{ input: { head: [1], pos: -1 }, output: [1] }],
  },

  // -------------------- 78. LEVEL ORDER BOTTOM-UP --------------------
  78: {
    title: "Level Order Traversal – Bottom Up",
    description: "Return level order traversal from bottom to top.",
    constraints: ["0 <= nodes <= 10^4"],
    examples: [
      {
        input: { root: [3, 9, 20, null, null, 15, 7] },
        output: [[15, 7], [9, 20], [3]],
      },
    ],
    testcases: [{ input: { root: [] }, output: [] }],
  },

  // -------------------- 79. DIAMETER USING DFS --------------------
  79: {
    title: "Diameter of Binary Tree – DFS",
    description: "Compute diameter using single DFS.",
    constraints: ["0 <= nodes <= 10^4"],
    examples: [{ input: { root: [1, 2, 3] }, output: 2 }],
    testcases: [{ input: { root: [1] }, output: 0 }],
  },

  // -------------------- 80. NUMBER OF ENCLAVES --------------------
  80: {
    title: "Number of Enclaves",
    description: "Return number of land cells that cannot walk off boundary.",
    constraints: ["1 <= m,n <= 500"],
    examples: [
      {
        input: {
          grid: [
            [0, 0, 0],
            [1, 0, 1],
            [0, 1, 1],
          ],
        },
        output: 3,
      },
    ],
    testcases: [
      {
        input: {
          grid: [
            [0, 0],
            [0, 0],
          ],
        },
        output: 0,
      },
    ],
  },
});
// ===============================================================
// QUESTION DETAILS (81 → 100)
// ===============================================================

Object.assign(questionFormats, {
  // -------------------- 81. TWO SUM V – COUNT ALL PAIRS --------------------
  81: {
    title: "Two Sum V – Count All Pairs",
    description:
      "Return the total number of index pairs (i, j) such that i < j and nums[i] + nums[j] == target.",
    constraints: ["2 <= nums.length <= 2 * 10^5"],
    examples: [{ input: { nums: [1, 5, 7, -1, 5], target: 6 }, output: 3 }],
    testcases: [{ input: { nums: [1, 1, 1, 1], target: 2 }, output: 6 }],
  },

  // -------------------- 82. MAX SUBARRAY AT LEAST K --------------------
  82: {
    title: "Maximum Subarray – At Least K Length",
    description:
      "Return the maximum sum of a contiguous subarray of length at least k.",
    constraints: ["1 <= k <= nums.length <= 10^5"],
    examples: [{ input: { nums: [1, 2, 3, -10, 5, 6], k: 2 }, output: 11 }],
    testcases: [{ input: { nums: [-1, -2, -3], k: 1 }, output: -1 }],
  },

  // -------------------- 83. STOCK – AT MOST TWO TRANSACTIONS --------------------
  83: {
    title: "Best Time to Buy and Sell Stock – At Most Two Transactions",
    description:
      "Return the maximum profit with at most two buy-sell transactions.",
    constraints: ["1 <= prices.length <= 10^5"],
    examples: [{ input: { prices: [3, 3, 5, 0, 0, 3, 1, 4] }, output: 6 }],
    testcases: [{ input: { prices: [1, 2, 3, 4, 5] }, output: 4 }],
  },

  // -------------------- 84. PRODUCT EXCEPT SELF (PREFIX & SUFFIX) --------------------
  84: {
    title: "Product of Array Except Self – Prefix & Suffix",
    description:
      "Return product of array except self using prefix & suffix arrays.",
    constraints: ["2 <= nums.length <= 10^5"],
    examples: [{ input: { nums: [2, 3, 4, 5] }, output: [60, 40, 30, 24] }],
    testcases: [{ input: { nums: [1, 2] }, output: [2, 1] }],
  },

  // -------------------- 85. ROTATE ARRAY – K > N --------------------
  85: {
    title: "Rotate Array – K Larger Than N",
    description:
      "Rotate array right by k steps where k may be larger than array length.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [{ input: { nums: [1, 2, 3], k: 4 }, output: [3, 1, 2] }],
    testcases: [{ input: { nums: [1], k: 10 }, output: [1] }],
  },

  // -------------------- 86. MERGE INTERVALS – TOTAL LENGTH --------------------
  86: {
    title: "Merge Intervals – Total Covered Length",
    description: "Merge overlapping intervals and return total covered length.",
    constraints: ["0 <= intervals.length <= 10^5"],
    examples: [
      {
        input: {
          intervals: [
            [1, 3],
            [2, 6],
            [8, 10],
          ],
        },
        output: 7,
      },
    ],
    testcases: [{ input: { intervals: [] }, output: 0 }],
  },

  // -------------------- 87. SET MATRIX ZEROES (O(1) SPACE) --------------------
  87: {
    title: "Set Matrix Zeroes – O(1) Space",
    description:
      "Use first row & column as markers to set zeroes in O(1) space.",
    constraints: ["1 <= m,n <= 200"],
    examples: [
      {
        input: {
          matrix: [
            [1, 0, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
        },
        output: [
          [0, 0, 0],
          [4, 0, 6],
          [7, 0, 9],
        ],
      },
    ],
    testcases: [{ input: { matrix: [[0]] }, output: [[0]] }],
  },

  // -------------------- 88. COUNT OCCURRENCES IN ROTATED ARRAY --------------------
  88: {
    title: "Count Occurrences in Rotated Sorted Array",
    description: "Return number of occurrences of target in rotated array.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [
      {
        input: { nums: [4, 4, 5, 6, 7, 0, 1, 2, 4], target: 4 },
        output: 3,
      },
    ],
    testcases: [{ input: { nums: [1, 1, 1], target: 1 }, output: 3 }],
  },

  // -------------------- 89. MAJORITY ELEMENT – NO MAJORITY --------------------
  89: {
    title: "Majority Element – No Majority Case",
    description: "Return majority element if exists, else return -1.",
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [{ input: { nums: [1, 2, 3, 2, 2] }, output: 2 }],
    testcases: [{ input: { nums: [1, 2, 3] }, output: -1 }],
  },

  // -------------------- 90. SPIRAL MATRIX – FROM CENTER --------------------
  90: {
    title: "Spiral Matrix – From Center",
    description: "Return spiral traversal starting from center cell.",
    constraints: ["n is odd"],
    examples: [
      {
        input: {
          matrix: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
        },
        output: [5, 4, 6, 2, 8, 1, 3, 7, 9],
      },
    ],
    testcases: [{ input: { matrix: [[1]] }, output: [1] }],
  },

  // -------------------- 91. VALID PALINDROME – NUMERIC ONLY --------------------
  91: {
    title: "Valid Palindrome – Numeric Only",
    description: "Check if numeric characters form a palindrome.",
    constraints: ["1 <= s.length <= 2 * 10^5"],
    examples: [{ input: { s: "a1b2c2b1d" }, output: true }],
    testcases: [{ input: { s: "abc123" }, output: false }],
  },

  // -------------------- 92. LONGEST PALINDROME – CENTER EXPANSION --------------------
  92: {
    title: "Longest Palindromic Substring – Center Expansion",
    description:
      "Return longest palindrome using expand-around-center approach.",
    constraints: ["1 <= s.length <= 2000"],
    examples: [{ input: { s: "cbbd" }, output: "bb" }],
    testcases: [{ input: { s: "a" }, output: "a" }],
  },

  // -------------------- 93. COUNT DISTINCT SUBSTRINGS --------------------
  93: {
    title: "Count Distinct Substrings Without Repeating",
    description: "Return count of substrings without repeated characters.",
    constraints: ["0 <= s.length <= 2 * 10^5"],
    examples: [{ input: { s: "abca" }, output: 8 }],
    testcases: [{ input: { s: "aaa" }, output: 3 }],
  },

  // -------------------- 94. VALID ANAGRAM – UNICODE --------------------
  94: {
    title: "Valid Anagram – Unicode",
    description: "Check anagram considering unicode characters.",
    constraints: ["1 <= s.length <= 10^5"],
    examples: [{ input: { s: "àçb", t: "çàb" }, output: true }],
    testcases: [{ input: { s: "ä", t: "a" }, output: false }],
  },

  // -------------------- 95. GROUP ANAGRAMS – CHAR COUNT --------------------
  95: {
    title: "Group Anagrams – Character Count",
    description: "Group anagrams using character frequency instead of sorting.",
    constraints: ["1 <= strs.length <= 10^4"],
    examples: [
      {
        input: { strs: ["eat", "tea", "ate", "bat"] },
        output: [["eat", "tea", "ate"], ["bat"]],
      },
    ],
    testcases: [{ input: { strs: ["a", "b"] }, output: [["a"], ["b"]] }],
  },

  // -------------------- 96. REVERSE LINKED LIST – PAIRS --------------------
  96: {
    title: "Reverse Linked List – In Pairs",
    description: "Swap every two adjacent nodes.",
    constraints: ["0 <= list length <= 10^4"],
    examples: [{ input: { head: [1, 2, 3, 4] }, output: [2, 1, 4, 3] }],
    testcases: [{ input: { head: [] }, output: [] }],
  },

  // -------------------- 97. LINKED LIST CYCLE – HASH SET --------------------
  97: {
    title: "Linked List Cycle – Hash Set",
    description: "Detect cycle using hash set.",
    constraints: ["0 <= list length <= 10^4"],
    examples: [{ input: { head: [1, 2], pos: 0 }, output: true }],
    testcases: [{ input: { head: [1], pos: -1 }, output: false }],
  },

  // -------------------- 98. RIGHT SIDE VIEW --------------------
  98: {
    title: "Binary Tree Right Side View",
    description: "Return nodes visible from right side.",
    constraints: ["0 <= nodes <= 10^4"],
    examples: [
      { input: { root: [1, 2, 3, null, 5, null, 4] }, output: [1, 3, 4] },
    ],
    testcases: [{ input: { root: [] }, output: [] }],
  },

  // -------------------- 99. DIAMETER – SKEWED TREE --------------------
  99: {
    title: "Diameter of Binary Tree – Skewed Tree",
    description: "Return diameter of a skewed tree.",
    constraints: ["0 <= nodes <= 10^4"],
    examples: [{ input: { root: [1, 2, null, 3, null, 4] }, output: 3 }],
    testcases: [{ input: { root: [1] }, output: 0 }],
  },

  // -------------------- 100. DISTINCT ISLAND SHAPES --------------------
  100: {
    title: "Count Distinct Islands (Shape Based)",
    description: "Return number of distinct island shapes.",
    constraints: ["1 <= m,n <= 50"],
    examples: [
      {
        input: {
          grid: [
            [1, 1, 0, 1],
            [1, 0, 0, 0],
            [0, 0, 1, 1],
            [0, 0, 1, 1],
          ],
        },
        output: 2,
      },
    ],
    testcases: [
      {
        input: {
          grid: [
            [0, 0],
            [0, 0],
          ],
        },
        output: 0,
      },
    ],
  },
});
// ===============================================================
// FINAL BUILD (APPLY OVERRIDES TO ALL 100 QUESTIONS)
// ===============================================================

// NOTE:
// - questions array PART-1 me already export ho chuki hai
// - yahan hum sirf safety + consistency ensure kar rahe hain

questions.forEach((q) => {
  const fmt = questionFormats[q.id];

  if (!fmt) return;

  // Ensure required fields exist
  q.description = fmt.description || q.description || "";
  q.constraints = Array.isArray(fmt.constraints) ? fmt.constraints : [];
  q.examples = Array.isArray(fmt.examples) ? fmt.examples : [];
  q.testcases = Array.isArray(fmt.testcases) ? fmt.testcases : [];

  q.inputFormat = fmt.inputFormat || q.inputFormat || "";
  q.outputFormat = fmt.outputFormat || q.outputFormat || "";
});

// ===============================================================
// MERGE TEST CASES FROM JUDGE DATA
// ===============================================================
questions.forEach((q) => {
  const judgeData = judgeQuestions[String(q.id)];
  if (judgeData && Array.isArray(judgeData.testcases)) {
    q.testcases = judgeData.testcases;
  }
});

// ===============================================================
// 🔥 VERY IMPORTANT SAFETY PATCH (BACKEND NEVER CRASHES)
// ===============================================================
// Fixes:
// ❌ Cannot read properties of undefined (reading '0')
// ❌ No testcases found
// ❌ judge/run.js crash
// ❌ submit.js infinite errors

questions.forEach((q) => {
  if (!Array.isArray(q.testcases) || q.testcases.length === 0) {
    q.testcases = [
      {
        input: {},
        output: null,
      },
    ];
  }
});

// ===============================================================
// DEBUG HELPER (OPTIONAL — CAN REMOVE LATER)
// ===============================================================
// Uncomment only if you want to verify data once
/*
console.log(
  "✅ Questions loaded:",
  questions.length,
  "Example Q1 testcases:",
  questions[0].testcases
);
*/

// ===============================================================
// END OF FILE
// ===============================================================
