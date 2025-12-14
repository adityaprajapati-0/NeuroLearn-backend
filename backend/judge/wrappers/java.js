// backend/judge/wrappers/java.js

export function wrapJava(userCode, input) {
  // Remove imports from user code
  const cleanedUserCode = userCode
    .split("\n")
    .filter(line => !line.trim().startsWith("import "))
    .join("\n");

  // 🔒 Extract solve() param count
  const match = cleanedUserCode.match(/solve\s*\(([^)]*)\)/);
  if (!match) {
    throw new Error("Java code must contain solve(...) method");
  }

  const params = match[1].trim();
  const paramCount = params === "" ? 0 : params.split(",").length;

  // 🔒 Only pass required number of inputs
  const values = Object.values(input || {}).slice(0, paramCount);

  const declarations = values
    .map((val, i) => {
      if (Array.isArray(val)) {
        return `int[] arg${i} = new int[]{${val.join(",")}};`;
      }
      if (typeof val === "number") {
        return `int arg${i} = ${val};`;
      }
      throw new Error("Unsupported Java input type");
    })
    .join("\n");

  const args = values.map((_, i) => `arg${i}`).join(", ");

  return `
import java.util.*;

${cleanedUserCode}

public class Main {
    public static void main(String[] args) {
        ${declarations}

        Solution sol = new Solution();
        Object result = sol.solve(${args});
        System.out.print(result);
    }
}
`;
}
