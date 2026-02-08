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

// ---------------- C/C++ WRAPPER HELPERS ----------------
const detectCStyleFunction = (code, preferredName = "solve") => {
  const regex =
    /(?:^|\n)\s*(?:static\s+|inline\s+|extern\s+|constexpr\s+)?([A-Za-z_][\w\s:*<>,\[\]&]*?)\s+([A-Za-z_]\w*)\s*\(([^()]*)\)\s*\{/g;
  const blacklist = new Set(["if", "for", "while", "switch", "catch"]);
  const found = [];
  let match;
  while ((match = regex.exec(code)) !== null) {
    const returnType = String(match[1] || "").trim();
    const name = String(match[2] || "").trim();
    const paramsText = String(match[3] || "").trim();

    if (!name || blacklist.has(name) || name === "main") continue;
    if (
      !returnType ||
      /^(if|for|while|switch|return|class|struct|enum|typedef|using)\b/.test(
        returnType,
      )
    )
      continue;

    const params =
      paramsText === "void" || !paramsText
        ? []
        : paramsText.split(",").map((p) => {
            const trimmed = p.trim();
            const parts = trimmed.split(/\s+/);
            const raw = parts[parts.length - 1];
            const nameMatch = raw.match(/([A-Za-z_]\w*)$/);
            const pName = nameMatch ? nameMatch[1] : "";
            const pType = trimmed.replace(pName, "").trim();
            return { type: pType, name: pName, raw: trimmed };
          });

    found.push({ name, returnType, params });
  }
  if (found.length === 0) return null;
  return found.find((f) => f.name === preferredName) || found[0];
};

const inferCppType = (value) => {
  if (value === null || value === undefined) return "int";
  if (typeof value === "boolean") return "bool";
  if (typeof value === "number")
    return Number.isInteger(value) ? "int" : "double";
  if (typeof value === "string") return "std::string";
  if (Array.isArray(value)) {
    if (value.length === 0) return "std::vector<int>";
    const inner = inferCppType(value[0]);
    return `std::vector<${inner}>`;
  }
  return "std::string";
};

const toCppValueExpr = (value, type) => {
  if (type.startsWith("std::vector<")) {
    const arr = Array.isArray(value) ? value : [];
    const innerType = type.slice("std::vector<".length, -1).trim();
    return `${type}{${arr.map((v) => toCppValueExpr(v, innerType)).join(", ")}}`;
  }
  if (type === "std::string")
    return `std::string("${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
  if (type === "bool") return value ? "true" : "false";
  return String(value);
};

const CPP_JSON_HELPERS = `
string __jsonEscape(const string& s) {
    string out; out.reserve(s.size() + 16);
    for (char c : s) {
        switch (c) {
            case '\\\\': out += "\\\\\\\\"; break;
            case '"': out += "\\\\\\""; break;
            case '\\n': out += "\\\\n"; break;
            case '\\r': out += "\\\\r"; break;
            case '\\t': out += "\\\\t"; break;
            default: out += c; break;
        }
    }
    return out;
}
string __toJson(...) { return "null"; }
string __toJson(const string& v) { return string("\"") + __jsonEscape(v) + "\""; }
string __toJson(const char* v) { return string("\"") + __jsonEscape(string(v ? v : "")) + "\""; }
string __toJson(bool v) { return v ? "true" : "false"; }
template <typename T> typename enable_if<is_integral<T>::value && !is_same<T, bool>::value, string>::type
__toJson(const T& v) { return to_string((long long)v); }
template <typename T> typename enable_if<is_floating_point<T>::value, string>::type
__toJson(const T& v) { ostringstream oss; oss << v; return oss.str(); }
template <typename T> string __toJson(const vector<T>& v) {
    string out = "["; for (size_t i = 0; i < v.size(); ++i) { if (i) out += ","; out += __toJson(v[i]); }
    return out + "]";
}
`;

export async function executeRemote(code, language, input = null) {
  const config = LANGUAGE_CONFIG[language];
  if (!config) throw new Error(`Language ${language} not supported by Piston.`);

  let finalCode = code;

  // Wrap Java if it doesn't have a main
  let javaArgs = [];
  if (language === "java") {
    // Basic heuristics to find the likely method signature to help with object mapping
    const javaMethodRegex =
      /public\s+(?:static\s+)?[\w<>[\]]+\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/;
    const m = javaMethodRegex.exec(code);
    const paramNames = m
      ? m[2]
          .split(",")
          .map((p) => {
            const parts = p.trim().split(/\s+/);
            const raw = parts[parts.length - 1];
            const nm = raw.match(/([A-Za-z_]\w*)$/);
            return nm ? nm[1] : "";
          })
          .filter(Boolean)
      : [];

    if (Array.isArray(input)) {
      javaArgs = input;
    } else if (input && typeof input === "object") {
      if (paramNames.length > 0) {
        javaArgs = paramNames.map((n) =>
          input[n] !== undefined ? input[n] : null,
        );
      } else {
        javaArgs = [input];
      }
    } else if (input !== null && input !== undefined) {
      javaArgs = [input];
    }
  }

  const argsLiteral = Array.isArray(javaArgs)
    ? `new Object[]{${javaArgs.map((arg) => toJavaObjectLiteral(arg)).join(",")}}`
    : `new Object[]{${toJavaObjectLiteral(input)}}`;

  // Extract imports and clean the code
  let userImports = [];
  let cleanCode = code.replace(/public\s+class/g, "class");

  // Find all top-level imports
  const importRegex = /^\s*import\s+[^;]+;\s*$/gm;
  let match;
  while ((match = importRegex.exec(cleanCode)) !== null) {
    userImports.push(match[0].trim());
  }
  // Remove imports from code body
  cleanCode = cleanCode.replace(importRegex, "");

  if (!/class\s+Solution\b/.test(cleanCode)) {
    cleanCode = `class Solution {\n${cleanCode}\n}\n`;
  }

  finalCode = `
import java.util.*;
import java.lang.reflect.*;
${userImports.join("\n")}

public class Main {
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
    static Method pickMethod(Method[] methods, int argc) {
        Method best = null; int bestScore = Integer.MAX_VALUE;
        for (Method m : methods) {
            String name = m.getName();
            if (name.equals("main") || name.equals("wait") || name.equals("notify") || name.equals("notifyAll") || m.isSynthetic()) continue;
            int pc = m.getParameterCount();
            int score = Math.abs(pc - argc);
            if (!name.equals("solve")) score += 2;
            if (!Modifier.isStatic(m.getModifiers())) score += 1;
            if (score < bestScore) { bestScore = score; best = m; }
        }
        return best;
    }
    static Object convert(Object raw, Class<?> targetType) {
        if (targetType == null) return raw;
        if (raw == null) {
            if (targetType.isPrimitive()) {
                if (targetType == boolean.class) return false;
                if (targetType == char.class) return '\0';
                return 0;
            }
            return null;
        }
        
        // Handle List/ArrayList
        if (java.util.List.class.isAssignableFrom(targetType) || targetType == java.util.ArrayList.class) {
            java.util.List<Object> list = new java.util.ArrayList<>();
            if (raw instanceof Object[]) {
                for (Object o : (Object[])raw) list.add(o);
            } else {
                list.add(raw);
            }
            return list;
        }

        if (targetType == String.class) return String.valueOf(raw);
        if (targetType == int.class || targetType == Integer.class) return (raw instanceof Number) ? ((Number)raw).intValue() : 0;
        if (targetType == long.class || targetType == Long.class) return (raw instanceof Number) ? ((Number)raw).longValue() : 0L;
        if (targetType == double.class || targetType == Double.class) return (raw instanceof Number) ? ((Number)raw).doubleValue() : 0.0d;
        if (targetType == float.class || targetType == Float.class) return (raw instanceof Number) ? ((Number)raw).floatValue() : 0.0f;
        if (targetType == boolean.class || targetType == Boolean.class) return (raw instanceof Boolean) ? (Boolean)raw : false;
        if (targetType == char.class || targetType == Character.class) return String.valueOf(raw).length() > 0 ? String.valueOf(raw).charAt(0) : '\0';

        if (targetType.isArray()) {
            Class<?> comp = targetType.getComponentType();
            if (!(raw instanceof Object[])) {
                Object arr = Array.newInstance(comp, 1);
                Array.set(arr, 0, convert(raw, comp));
                return arr;
            }
            Object[] src = (Object[])raw;
            Object arr = Array.newInstance(comp, src.length);
            for (int i=0; i<src.length; i++) Array.set(arr, i, convert(src[i], comp));
            return arr;
        }
        return raw;
    }
    static String toJson(Object v) {
        if (v == null) return "null";
        if (v instanceof String) return (char)34 + v.toString().replace(String.valueOf((char)34), (char)92 + "" + (char)34) + (char)34;
        if (v instanceof Number || v instanceof Boolean) return String.valueOf(v);
        if (v instanceof Character) return (char)34 + v.toString() + (char)34;
        if (v.getClass().isArray()) {
            int n = java.lang.reflect.Array.getLength(v);
            StringBuilder sb = new StringBuilder("[");
            for (int i=0; i<n; i++) { if (i>0) sb.append(","); sb.append(toJson(java.lang.reflect.Array.get(v, i))); }
            return sb.append("]").toString();
        }
        if (v instanceof java.util.Collection) return toJson(((java.util.Collection)v).toArray());
        return String.valueOf(v);
    }
    public static void main(String[] args) {
        try {
            Class<?> sol = Class.forName("Solution");
            Object[] rawArgs = ${argsLiteral};
            Method m = pickMethod(sol.getDeclaredMethods(), rawArgs.length);
            if (m == null) { System.err.println("No suitable method found in Solution class."); System.exit(1); }
            m.setAccessible(true);
            Object target = Modifier.isStatic(m.getModifiers()) ? null : sol.getConstructor().newInstance();
            Object[] finalArgs = new Object[m.getParameterCount()];
            for(int i=0; i<finalArgs.length; i++) {
                finalArgs[i] = convert(i < rawArgs.length ? rawArgs[i] : null, m.getParameterTypes()[i]);
            }
            Object res = m.invoke(target, finalArgs);
            System.out.print("RESULT_START" + toJson(res) + "RESULT_END");
        } catch (java.lang.reflect.InvocationTargetException e) {
            e.getCause().printStackTrace(); System.exit(1);
        } catch (Throwable t) {
            t.printStackTrace(); System.exit(1);
        }
    }
}

${cleanCode}
`;

  // Robust C++ Wrapper
  if (language === "cpp" && !code.includes("int main")) {
    const entry = detectCStyleFunction(code, "solve");
    if (entry) {
      // Intelligent C++ Args Selection & Object-to-Array Mapping
      let args = [];
      if (Array.isArray(input)) {
        if (input.length === entry.params.length) {
          args = input; // Perfect match
        } else if (entry.params.length === 1) {
          args = [input]; // Function takes 1 arg, which IS the array
        } else {
          args = input; // Fallback to raw array
        }
      } else if (input && typeof input === "object") {
        args = entry.params.map((p) => {
          if (input[p.name] !== undefined) return input[p.name];
          const keys = Object.keys(input);
          if (entry.params.length === 1 && keys.length === 1)
            return input[keys[0]];
          return null;
        });
      } else if (input !== null && input !== undefined) {
        args = [input];
      }

      const declarations = args
        .map((arg, i) => {
          const type = entry.params[i]
            ? entry.params[i].type
            : inferCppType(arg);
          return `    ${type} arg${i} = ${toCppValueExpr(arg, type)};`;
        })
        .join("\n");
      const callArgs = args.map((_, i) => `arg${i}`).join(", ");

      finalCode = `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <map>
#include <set>
#include <unordered_set>
#include <queue>
#include <stack>
#include <cmath>
#include <type_traits>
#include <sstream>
using namespace std;

${code}

${CPP_JSON_HELPERS}

int main() {
    try {
${declarations}
        auto result = ${entry.name}(${callArgs});
        cout << "RESULT_START" << __toJson(result) << "RESULT_END";
    } catch (const exception& e) {
        cerr << e.what();
        return 1;
    } catch (...) {
        return 1;
    }
    return 0;
}
`;
    }
  }

  // Basic C Wrapper
  if (language === "c" && !code.includes("int main")) {
    finalCode = `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n${code}\nint main() { return 0; }`;
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
            name:
              language === "java"
                ? "Main.java"
                : language === "cpp"
                  ? "solution.cpp"
                  : language === "python"
                    ? "solution.py"
                    : "solution",
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
