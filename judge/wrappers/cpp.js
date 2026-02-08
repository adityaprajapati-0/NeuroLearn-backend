// backend/judge/wrappers/cpp.js

export function wrapCpp(code, input) {
  const values = Object.values(input || {});

  // Build C++ variable declarations
  const declarations = values
    .map((val, i) => {
      if (Array.isArray(val)) {
        return `vector<int> arg${i} = {${val.join(",")}};`;
      }
      if (typeof val === "number") {
        return `int arg${i} = ${val};`;
      }
      return `auto arg${i} = ${JSON.stringify(val)};`;
    })
    .join("\n");

  const args = values.map((_, i) => `arg${i}`).join(", ");

  return `
#include <bits/stdc++.h>
using namespace std;

${code}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(NULL);

    ${declarations}

    auto result = solve(${args});

    // Print vector<int> as JSON array
    cout << "[";
    for (int i = 0; i < result.size(); i++) {
        cout << result[i];
        if (i + 1 < result.size()) cout << ",";
    }
    cout << "]";
    return 0;
}
`;
}
