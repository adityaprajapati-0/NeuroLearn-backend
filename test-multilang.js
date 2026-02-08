import fetch from "node-fetch";

async function testMultiLang() {
  const cases = [
    {
      lang: "python",
      code: `def solve(nums, target):
    mapping = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in mapping:
            return [mapping[diff], i]
        mapping[n] = i
    return []`,
    },
    {
      lang: "cpp",
      code: `
#include <vector>
#include <unordered_map>
using namespace std;

vector<int> solve(vector<int>& nums, int target) {
    unordered_map<int, int> mapping;
    for (int i = 0; i < (int)nums.size(); i++) {
        int diff = target - nums[i];
        if (mapping.count(diff)) {
            return {mapping[diff], i};
        }
        mapping[nums[i]] = i;
    }
    return {};
}`,
    },
    {
      lang: "java",
      code: `
import java.util.*;
class Solution {
    public static int[] solve(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int diff = target - nums[i];
            if (map.containsKey(diff)) {
                return new int[] { map.get(diff), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
}`,
    },
    {
      lang: "c",
      code: `
#include <stdlib.h>
int* solve(int* nums, int numsSize, int target) {
    for (int i = 0; i < numsSize; i++) {
        for (int j = i + 1; j < numsSize; j++) {
            if (nums[i] + nums[j] == target) {
                int* res = (int*)malloc(2 * sizeof(int));
                res[0] = i; res[1] = j;
                return res;
            }
        }
    }
    return NULL;
}`,
    },
  ];

  for (const test of cases) {
    console.log(`Testing ${test.lang}...`);
    try {
      const response = await fetch("http://localhost:4500/api/code/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: test.code,
          questionId: 1,
          userId: "GUEST",
          language: test.lang,
        }),
      });

      const data = await response.json();
      console.log(`${test.lang} result summary:`, data.message);
      if (!data.passed) {
        console.log(
          `${test.lang} first error:`,
          data.results[0]?.error || "No error",
        );
        console.log(
          `${test.lang} actual vs expected:`,
          data.results[0]?.actual,
          "vs",
          data.results[0]?.expected,
        );
      }
    } catch (error) {
      console.error(`${test.lang} error:`, error.message);
    }
  }
}

testMultiLang();
