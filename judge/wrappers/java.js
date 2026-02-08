// backend/judge/wrappers/java.js

export function wrapJava(userCode, input) {
  // 🔥 REMOVE ALL IMPORTS FROM USER CODE
  const cleanedUserCode = userCode
    .split("\n")
    .filter(line => !line.trim().startsWith("import "))
    .join("\n");

  const values = Object.values(input || {});

  const declarations = values
    .map((val, i) => {
      if (Array.isArray(val)) {
        return `int[] arg${i} = new int[]{${val.join(",")}};`;
      }
      if (typeof val === "number") {
        return `int arg${i} = ${val};`;
      }
      if (typeof val === "string") {
        return `String arg${i} = "${val.replace(/"/g, '\\"')}";`;
      }
      throw new Error("Unsupported input type for Java");
    })
    .join("\n");

  const args = values.map((_, i) => `arg${i}`).join(", ");

  return `
import java.util.*;

public class Main {
    public static void main(String[] args) {
        ${declarations}

        Object result = Solution.solve(${args});
        System.out.print(toJson(result));
    }

    static String toJson(Object obj) {
        if (obj == null) return "null";

        if (obj instanceof int[]) {
            return Arrays.toString((int[]) obj);
        }

        if (obj instanceof List) {
            return obj.toString();
        }

        return obj.toString();
    }
}

${cleanedUserCode}
`;
}
