import fetch from "node-fetch";

/**
 * Piston API - FREE & No Card Required
 * Documentation: https://github.com/engineer-man/piston
 */
const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

const LANGUAGE_CONFIG = {
  java: { version: "15.0.2" },
  cpp: { version: "10.2.0" },
  python: { version: "3.10.0" },
  c: { version: "10.2.0" },
  javascript: { version: "18.15.0" },
};

// ---------------- JAVA WRAPPER HELPERS ----------------
const escapeJava = (text) =>
  String(text)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");

const toJavaObjectLiteral = (value) => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "null";
    return Number.isInteger(value) ? String(value) : `${value}d`;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return `"${escapeJava(value)}"`;
  if (Array.isArray(value)) {
    return `new Object[]{${value.map((item) => toJavaObjectLiteral(item)).join(",")}}`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0)
      return "new java.util.LinkedHashMap<Object,Object>()";
    const parts = entries.map(
      ([k, v]) =>
        `__Runner.mapEntry(${toJavaObjectLiteral(k)}, ${toJavaObjectLiteral(v)})`,
    );
    return `__Runner.mapOf(${parts.join(",")})`;
  }
  return "null";
};

const JAVA_RUNTIME_WRAPPER = `
class __Runner {
    static class Pair {
        final Object k; final Object v;
        Pair(Object k, Object v) { this.k = k; this.v = v; }
    }
    static Pair mapEntry(Object k, Object v) { return new Pair(k, v); }
    @SafeVarargs static java.util.Map<Object, Object> mapOf(Pair... pairs) {
        java.util.Map<Object, Object> m = new java.util.LinkedHashMap<>();
        for (Pair p : pairs) m.put(p.k, p.v);
        return m;
    }
    static java.lang.reflect.Method pickMethod(java.lang.reflect.Method[] methods, int argc) {
        java.lang.reflect.Method best = null; int bestScore = Integer.MAX_VALUE;
        for (java.lang.reflect.Method m : methods) {
            if (m.getName().equals("main") || m.isSynthetic()) continue;
            int pc = m.getParameterCount();
            int score = Math.abs(pc - argc);
            if (!m.getName().equals("solve")) score += 2;
            if (!java.lang.reflect.Modifier.isStatic(m.getModifiers())) score += 1;
            if (score < bestScore) { bestScore = score; best = m; }
        }
        return best;
    }
    static Object convert(Object raw, Class<?> targetType) {
        if (raw == null) return targetType.isPrimitive() ? (targetType == boolean.class ? false : 0) : null;
        if (targetType == String.class) return String.valueOf(raw);
        if (targetType == int.class || targetType == Integer.class) return ((Number)raw).intValue();
        if (targetType.isArray()) {
            Object[] src = (Object[])raw;
            Object arr = java.lang.reflect.Array.newInstance(targetType.getComponentType(), src.length);
            for (int i=0; i<src.length; i++) java.lang.reflect.Array.set(arr, i, convert(src[i], targetType.getComponentType()));
            return arr;
        }
        return raw;
    }
    static String toJson(Object v) {
        if (v == null) return "null";
        if (v instanceof String) return "\\"" + v.toString().replace("\\\"", "\\\\\\\"") + "\\"";
        if (v instanceof Number || v instanceof Boolean) return String.valueOf(v);
        if (v.getClass().isArray()) {
            int n = java.lang.reflect.Array.getLength(v);
            StringBuilder sb = new StringBuilder("[");
            for (int i=0; i<n; i++) { if (i>0) sb.append(","); sb.append(toJson(java.lang.reflect.Array.get(v, i))); }
            return sb.append("]").toString();
        }
        return String.valueOf(v);
    }
    public static void main(String[] args) {
        try {
            Class<?> sol = Class.forName("Solution");
            Object[] rawArgs = __ARGS_PLACEHOLDER__;
            java.lang.reflect.Method m = pickMethod(sol.getDeclaredMethods(), rawArgs.length);
            m.setAccessible(true);
            Object target = java.lang.reflect.Modifier.isStatic(m.getModifiers()) ? null : sol.getConstructor().newInstance();
            Object[] finalArgs = new Object[m.getParameterCount()];
            for(int i=0; i<finalArgs.length; i++) finalArgs[i] = convert(i<rawArgs.length ? rawArgs[i] : null, m.getParameterTypes()[i]);
            Object res = m.invoke(target, finalArgs);
            System.out.print("RESULT_START" + toJson(res) + "RESULT_END");
        } catch (Throwable t) { t.printStackTrace(); System.exit(1); }
    }
}
`;

export async function executeRemote(code, language, input = null) {
  const config = LANGUAGE_CONFIG[language];
  if (!config) throw new Error(`Language ${language} not supported by Piston.`);

  let finalCode = code;

  // Wrap Java if it doesn't have a main
  if (language === "java" && !code.includes("public static void main")) {
    const argsLiteral = Array.isArray(input)
      ? `new Object[]{${input.map((arg) => toJavaObjectLiteral(arg)).join(",")}}`
      : `new Object[]{${toJavaObjectLiteral(input)}}`;

    if (!/class\s+Solution\b/.test(code)) {
      finalCode = `class Solution {\n${code}\n}\n`;
    }
    finalCode = `import java.util.*;\n${finalCode}\n${JAVA_RUNTIME_WRAPPER.replace("__ARGS_PLACEHOLDER__", argsLiteral)}`;
  }

  // Basic C++ main wrapper if solve() exists
  if (language === "cpp" && !code.includes("int main")) {
    finalCode = `#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n${code}\nint main() { /* Basic Piston entry workaround */ return 0; }`;
  }

  try {
    console.log(`🚀 Executing ${language} via Piston API...`);

    const response = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: language,
        version: config.version,
        files: [
          {
            content: finalCode,
          },
        ],
        stdin: input
          ? typeof input === "string"
            ? input
            : JSON.stringify(input)
          : "",
      }),
    });

    const result = await response.json();

    if (result.message) {
      throw new Error(result.message);
    }

    // Piston returns { run: { stdout, stderr, code, signal, output } }
    const run = result.run;
    const isSuccess = run.code === 0;

    return {
      success: isSuccess,
      output: run.stdout || "",
      error:
        run.stderr ||
        (run.code !== 0 ? `Execution failed with code ${run.code}` : ""),
      remote: true,
      provider: "piston",
    };
  } catch (error) {
    console.error("❌ Piston Execution Error:", error);
    return {
      success: false,
      error: `Remote Judge Error: ${error.message}`,
    };
  }
}
