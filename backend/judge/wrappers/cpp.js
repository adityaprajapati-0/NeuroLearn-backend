// backend/judge/wrappers/cpp.js

export function wrapCpp(code, input) {
  // 🔒 Extract solve() parameter list
  const match = code.match(/solve\s*\(([^)]*)\)/);
  if (!match) {
    throw new Error("C++ code must contain solve(...) method");
  }

  const params = match[1].trim();
  const paramCount = params === "" ? 0 : params.split(",").length;

  // 🔒 Only take required inputs
  const values = Object.values(input || {}).slice(0, paramCount);

  const declarations = values
    .map((val, i) => {
      if (Array.isArray(val)) {
        return `vector<int> arg${i} = {${val.join(",")}};`;
      }
      if (typeof val === "number") {
        return `int arg${i} = ${val};`;
      }
      throw new Error("Unsupported C++ input type");
    })
    .join("\n");

  const args = values.map((_, i) => `arg${i}`).join(", ");

  return `
#include <bits/stdc++.h>
using namespace std;

${code}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    ${declarations}

    Solution sol;
    auto result = sol.solve(${args});

    cout << result;
    return 0;
}
`;
}
