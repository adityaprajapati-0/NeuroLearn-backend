import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const execPromise = promisify(exec);
const TEMP_DIR = path.join(process.cwd(), "temp_exec");

async function ensureTempDir() {
  try {
    await fs.access(TEMP_DIR);
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
}

function escapeForDoubleQuotedString(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function normalizeInputArgs(input) {
  if (Array.isArray(input)) return input;
  if (input === null || input === undefined) return [];
  return [input];
}

function getJsFunctionCandidates(code) {
  const names = new Set();
  const functionDecl = /(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(/g;
  const varFn =
    /(?:^|\n)\s*(?:const|let|var)\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?(?:function\s*\(|\([^)]*\)\s*=>|[A-Za-z_]\w*\s*=>)/g;

  let match;
  while ((match = functionDecl.exec(code)) !== null) {
    names.add(match[1]);
  }
  while ((match = varFn.exec(code)) !== null) {
    names.add(match[1]);
  }

  names.delete("__run");
  names.delete("main");
  if (names.has("solve")) {
    const rest = [...names].filter((n) => n !== "solve");
    return ["solve", ...rest];
  }
  return [...names];
}

function getPythonFunctionCandidates(code) {
  const names = new Set();
  const fnRegex = /(?:^|\n)\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/g;
  let match;
  while ((match = fnRegex.exec(code)) !== null) {
    names.add(match[1]);
  }

  names.delete("__main__");
  if (names.has("solve")) {
    const rest = [...names].filter((n) => n !== "solve");
    return ["solve", ...rest];
  }
  return [...names];
}

function detectCStyleFunction(code, preferredName = "solve") {
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
    if (!returnType) continue;
    if (
      /^(if|for|while|switch|return|class|struct|enum|typedef|using)\b/.test(
        returnType,
      )
    ) {
      continue;
    }

    const params =
      !paramsText || paramsText === "void"
        ? []
        : paramsText
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);

    found.push({ name, returnType, params });
  }

  if (found.length === 0) return null;
  const preferred = found.find((f) => f.name === preferredName);
  return preferred || found[0];
}

function inferCppType(value) {
  if (value === null || value === undefined) return "int";
  if (typeof value === "boolean") return "bool";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "double";
    if (Number.isInteger(value)) {
      if (value >= -2147483648 && value <= 2147483647) return "int";
      return "long long";
    }
    return "double";
  }
  if (typeof value === "string") return "std::string";
  if (Array.isArray(value)) {
    if (value.length === 0) return "std::vector<int>";
    const childTypes = [...new Set(value.map((v) => inferCppType(v)))];
    const childType =
      childTypes.length === 1 ? childTypes[0] : "std::string";
    return `std::vector<${childType}>`;
  }
  return "std::string";
}

function getCppVectorInnerType(type) {
  const prefix = "std::vector<";
  if (!type.startsWith(prefix) || !type.endsWith(">")) return null;
  return type.slice(prefix.length, -1).trim();
}

function toCppValueExpr(value, type = inferCppType(value)) {
  const inner = getCppVectorInnerType(type);
  if (inner) {
    const arr = Array.isArray(value) ? value : [];
    const body = arr.map((v) => toCppValueExpr(v, inner)).join(", ");
    return `${type}{${body}}`;
  }

  if (type === "std::string") {
    return `std::string("${escapeForDoubleQuotedString(value)}")`;
  }
  if (type === "bool") {
    return value ? "true" : "false";
  }
  if (type === "long long") {
    const n = Number.isFinite(Number(value)) ? Number(value) : 0;
    return `${Math.trunc(n)}LL`;
  }
  if (type === "double") {
    const n = Number.isFinite(Number(value)) ? Number(value) : 0;
    return `${n}`;
  }
  if (type === "int") {
    const n = Number.isFinite(Number(value)) ? Number(value) : 0;
    return `${Math.trunc(n)}`;
  }

  if (typeof value === "number") return `${value}`;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    return `std::string("${escapeForDoubleQuotedString(value)}")`;
  }
  return "0";
}

export async function executeMultiLangEngine(
  code,
  language,
  input = null,
  timeout = 5000,
  expectedOutput = null,
) {
  await ensureTempDir();
  const requestId = uuidv4();
  const workDir = path.join(TEMP_DIR, requestId);
  await fs.mkdir(workDir);

  try {
    switch (language) {
      case "javascript":
        return await runNode(code, input, timeout);
      case "python":
        return await runPython(code, workDir, input, timeout);
      case "cpp":
        return await runCpp(code, workDir, input, timeout);
      case "c":
        return await runC(code, workDir, input, timeout, expectedOutput);
      case "java":
        return await runJava(code, workDir, input, timeout);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  } catch (err) {
    console.error(`[EXECUTOR ERROR] ${language}:`, err);
    return { success: false, error: err.message };
  } finally {
    // Cleanup temp files after a delay
    setTimeout(() => {
      fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }, 2000);
  }
}

async function runNode(code, input, timeout) {
  const inputStr = input !== undefined ? JSON.stringify(input) : "null";
  const candidates = getJsFunctionCandidates(code);
  const candidateExpr = candidates
    .map((name) => `(typeof ${name} === 'function' ? ${name} : null)`)
    .join(",\n      ");
  const wrappedCode = `
${code}
async function __run() {
  try {
    const input = ${inputStr};
    const callables = [
      ${candidateExpr || "null"}
    ].filter(Boolean);
    const entry = callables[0];
    if (!entry) {
      throw new Error("No callable function found. Define solve(...) or one top-level function.");
    }

    let result;
    if (Array.isArray(input)) {
      try {
        result = await entry(...input);
      } catch (spreadErr) {
        result = await entry(input);
      }
    } else if (input && typeof input === "object") {
      try {
        result = await entry(...Object.values(input));
      } catch (objectSpreadErr) {
        result = await entry(input);
      }
    } else {
      result = await entry(input);
    }

    process.stdout.write("RESULT_START" + JSON.stringify({ result }) + "RESULT_END");
  } catch (e) {
    process.stderr.write(e.message);
    process.exit(1);
  }
}
__run();
`;
  const jsFile = path.join(TEMP_DIR, `${uuidv4()}.js`);
  await fs.writeFile(jsFile, wrappedCode);
  try {
    const { stdout, stderr } = await execPromise(`node "${jsFile}"`, {
      timeout,
    });
    const match = stdout.match(/RESULT_START(.*)RESULT_END/);
    if (!match) throw new Error("Could not parse output: " + stdout);
    return {
      success: true,
      output: JSON.parse(match[1]).result,
      error: stderr,
    };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  } finally {
    await fs.unlink(jsFile).catch(() => {});
  }
}

async function runPython(code, workDir, input, timeout) {
  const pyFile = path.join(workDir, "solution.py");
  const inputFile = path.join(workDir, "input.json");
  await fs.writeFile(inputFile, JSON.stringify(input));
  const candidates = getPythonFunctionCandidates(code);
  const candidateList = JSON.stringify(candidates);

  const wrappedCode = `
import json
import sys

${code}

ENTRY_CANDIDATES = ${candidateList}

def _pick_entry_function():
    for name in ENTRY_CANDIDATES:
        fn = globals().get(name)
        if callable(fn):
            return fn
    raise NameError("No callable function found. Define solve(...) or one top-level function.")

if __name__ == "__main__":
    try:
        with open("input.json", "r") as f:
            input_data = json.load(f)

        entry_fn = _pick_entry_function()

        def _invoke_entry(fn, data):
            if isinstance(data, list):
                try:
                    return fn(*data)
                except TypeError as first_error:
                    try:
                        return fn(data)
                    except TypeError:
                        # Fallback for fixed-arity signatures when testcase arity differs.
                        try:
                            arg_count = fn.__code__.co_argcount
                            if arg_count > len(data):
                                padded = list(data) + [None] * (arg_count - len(data))
                                return fn(*padded)
                        except Exception:
                            pass
                        raise first_error
            if isinstance(data, dict):
                try:
                    return fn(**data)
                except TypeError:
                    try:
                        return fn(*list(data.values()))
                    except TypeError:
                        return fn(data)
            return fn(data)

        result = _invoke_entry(entry_fn, input_data)
             
        sys.stdout.write("RESULT_START" + json.dumps({"result": result}) + "RESULT_END")
    except Exception as e:
        sys.stderr.write(str(e))
        sys.exit(1)
`;
  await fs.writeFile(pyFile, wrappedCode);
  try {
    const { stdout, stderr } = await execPromise(`python "${pyFile}"`, {
      timeout,
      cwd: workDir,
    });
    const match = stdout.match(/RESULT_START(.*)RESULT_END/);
    if (!match) throw new Error("Could not parse output: " + stdout);
    return {
      success: true,
      output: JSON.parse(match[1]).result,
      error: stderr,
    };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  }
}

async function runCpp(code, workDir, input, timeout) {
  const cppFile = path.join(workDir, "solution.cpp");
  const exeFile = path.join(workDir, "solution.exe");
  const inputFile = path.join(workDir, "input.json");
  await fs.writeFile(inputFile, JSON.stringify(input ?? null));

  const hasMain = /\bint\s+main\s*\(/.test(code);

  let finalCode = `
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
`;

  if (!hasMain) {
    const entry = detectCStyleFunction(code, "solve");
    if (!entry) {
      return {
        success: false,
        error:
          "No callable C++ function found. Define solve(...) or one top-level function.",
      };
    }

    const args = normalizeInputArgs(input);
    const declarations = args
      .map((arg, i) => {
        const type = inferCppType(arg);
        const valueExpr = toCppValueExpr(arg, type);
        return `${type} arg${i} = ${valueExpr};`;
      })
      .join("\n        ");
    const callArgs = args.map((_, i) => `arg${i}`).join(", ");

    finalCode += `
string __jsonEscape(const string& s) {
    string out;
    out.reserve(s.size() + 16);
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

string __toJson(const string& v) {
    return string("\\"") + __jsonEscape(v) + "\\"";
}

string __toJson(const char* v) {
    return string("\\"") + __jsonEscape(string(v ? v : "")) + "\\"";
}

string __toJson(char* v) {
    return string("\\"") + __jsonEscape(string(v ? v : "")) + "\\"";
}

string __toJson(bool v) {
    return v ? "true" : "false";
}

template <typename T>
typename enable_if<is_integral<T>::value && !is_same<T, bool>::value, string>::type
__toJson(const T& v) {
    return to_string((long long)v);
}

template <typename T>
typename enable_if<is_floating_point<T>::value, string>::type
__toJson(const T& v) {
    ostringstream oss;
    oss << v;
    return oss.str();
}

template <typename T>
string __toJson(const vector<T>& v) {
    string out = "[";
    for (size_t i = 0; i < v.size(); ++i) {
        if (i) out += ",";
        out += __toJson(v[i]);
    }
    out += "]";
    return out;
}

template <typename A, typename B>
string __toJson(const pair<A, B>& v) {
    return string("[") + __toJson(v.first) + "," + __toJson(v.second) + "]";
}

int main() {
    try {
        ${declarations || ""}
        auto result = ${entry.name}(${callArgs});
        cout << "RESULT_START" << __toJson(result) << "RESULT_END";
    } catch (const exception& e) {
        cerr << e.what();
        return 1;
    } catch (...) {
        cerr << "Runtime error";
        return 1;
    }
    return 0;
}
`;
  }

  await fs.writeFile(cppFile, finalCode);
  try {
    await execPromise(`g++ -std=c++17 "${cppFile}" -o "${exeFile}"`);
    const { stdout, stderr } = await execPromise(`"${exeFile}"`, {
      timeout,
      cwd: workDir,
    });
    const match = stdout.match(/RESULT_START(.*)RESULT_END/);
    let output = match ? match[1] : stdout.trim();
    return { success: true, output, error: stderr };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  }
}

async function runJava(code, workDir, input, timeout) {
  const javaFile = path.join(workDir, "Solution.java");
  let finalCode = code;

  // Build Java Object[] args literal from JS input.
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
      if (entries.length === 0) {
        return "new java.util.LinkedHashMap<Object,Object>()";
      }
      const parts = entries.map(
        ([k, v]) =>
          `__Runner.mapEntry(${toJavaObjectLiteral(k)}, ${toJavaObjectLiteral(v)})`,
      );
      return `__Runner.mapOf(${parts.join(",")})`;
    }
    return "null";
  };

  const argsLiteral = Array.isArray(input)
    ? `new Object[]{${input.map((arg) => toJavaObjectLiteral(arg)).join(",")}}`
    : `new Object[]{${toJavaObjectLiteral(input)}}`;

  if (!/class\s+Solution\b/.test(finalCode)) {
    finalCode = `class Solution {\n${code}\n}\n`;
  }

  const runtimeWrapper = `
class __Runner {
    static class Pair {
        final Object k;
        final Object v;
        Pair(Object k, Object v) { this.k = k; this.v = v; }
    }

    static Pair mapEntry(Object k, Object v) {
        return new Pair(k, v);
    }

    @SafeVarargs
    static java.util.Map<Object, Object> mapOf(Pair... pairs) {
        java.util.Map<Object, Object> m = new java.util.LinkedHashMap<>();
        for (Pair p : pairs) m.put(p.k, p.v);
        return m;
    }

    static Method pickMethod(Method[] methods, int argc) {
        Method best = null;
        int bestScore = Integer.MAX_VALUE;
        for (Method m : methods) {
            if (m.getName().equals("main")) continue;
            if (m.isSynthetic()) continue;
            int pc = m.getParameterCount();
            int score;
            if (m.isVarArgs()) {
                int minArgs = Math.max(0, pc - 1);
                score = argc < minArgs ? (minArgs - argc) + 10 : (argc - minArgs);
            } else {
                score = Math.abs(pc - argc);
            }
            if (!m.getName().equals("solve")) score += 2;
            if (!Modifier.isStatic(m.getModifiers())) score += 1;
            if (score < bestScore) {
                bestScore = score;
                best = m;
            }
        }
        return best;
    }

    static Object defaultPrimitive(Class<?> type) {
        if (type == boolean.class) return false;
        if (type == char.class) return '\\0';
        if (type == byte.class) return (byte) 0;
        if (type == short.class) return (short) 0;
        if (type == int.class) return 0;
        if (type == long.class) return 0L;
        if (type == float.class) return 0f;
        if (type == double.class) return 0d;
        return null;
    }

    static Number asNumber(Object raw) {
        if (raw instanceof Number) return (Number) raw;
        if (raw instanceof Boolean) return (Boolean) raw ? 1 : 0;
        try {
            return Double.parseDouble(String.valueOf(raw));
        } catch (Exception e) {
            return 0;
        }
    }

    static Object[] asObjectArray(Object raw) {
        if (raw == null) return new Object[0];
        if (raw instanceof Object[]) return (Object[]) raw;
        Class<?> cls = raw.getClass();
        if (cls.isArray()) {
            int n = java.lang.reflect.Array.getLength(raw);
            Object[] out = new Object[n];
            for (int i = 0; i < n; i++) out[i] = java.lang.reflect.Array.get(raw, i);
            return out;
        }
        if (raw instanceof java.util.List) {
            return ((java.util.List<?>) raw).toArray();
        }
        return new Object[] { raw };
    }

    static Object convert(Object raw, Class<?> targetType) {
        if (raw == null) return targetType.isPrimitive() ? defaultPrimitive(targetType) : null;
        if (targetType == Object.class) return raw;
        if (targetType == String.class) return String.valueOf(raw);
        if (targetType == boolean.class || targetType == Boolean.class) {
            if (raw instanceof Boolean) return raw;
            return Boolean.parseBoolean(String.valueOf(raw));
        }
        if (targetType == int.class || targetType == Integer.class) return asNumber(raw).intValue();
        if (targetType == long.class || targetType == Long.class) return asNumber(raw).longValue();
        if (targetType == double.class || targetType == Double.class) return asNumber(raw).doubleValue();
        if (targetType == float.class || targetType == Float.class) return asNumber(raw).floatValue();
        if (targetType == short.class || targetType == Short.class) return asNumber(raw).shortValue();
        if (targetType == byte.class || targetType == Byte.class) return asNumber(raw).byteValue();

        if (targetType.isArray()) {
            Class<?> component = targetType.getComponentType();
            Object[] src = asObjectArray(raw);
            Object arr = java.lang.reflect.Array.newInstance(component, src.length);
            for (int i = 0; i < src.length; i++) {
                java.lang.reflect.Array.set(arr, i, convert(src[i], component));
            }
            return arr;
        }

        if (java.util.List.class.isAssignableFrom(targetType)) {
            Object[] src = asObjectArray(raw);
            return new java.util.ArrayList<>(java.util.Arrays.asList(src));
        }
        if (java.util.Map.class.isAssignableFrom(targetType)) {
            if (raw instanceof java.util.Map) return raw;
            return new java.util.LinkedHashMap<>();
        }

        return raw;
    }

    static Object[] prepareArgs(Method m, Object[] rawArgs) {
        Class<?>[] paramTypes = m.getParameterTypes();
        if (!m.isVarArgs()) {
            Object[] out = new Object[paramTypes.length];
            for (int i = 0; i < paramTypes.length; i++) {
                Object raw = i < rawArgs.length ? rawArgs[i] : null;
                out[i] = convert(raw, paramTypes[i]);
            }
            return out;
        }

        int fixed = Math.max(0, paramTypes.length - 1);
        Object[] out = new Object[paramTypes.length];
        for (int i = 0; i < fixed; i++) {
            Object raw = i < rawArgs.length ? rawArgs[i] : null;
            out[i] = convert(raw, paramTypes[i]);
        }
        Class<?> varComponent = paramTypes[paramTypes.length - 1].getComponentType();
        int varCount = Math.max(0, rawArgs.length - fixed);
        Object varArr = java.lang.reflect.Array.newInstance(varComponent, varCount);
        for (int i = 0; i < varCount; i++) {
            java.lang.reflect.Array.set(varArr, i, convert(rawArgs[fixed + i], varComponent));
        }
        out[paramTypes.length - 1] = varArr;
        return out;
    }

    static String jsonEscape(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '\\\\': sb.append("\\\\\\\\"); break;
                case '"': sb.append("\\\\\\""); break;
                case '\\n': sb.append("\\\\n"); break;
                case '\\r': sb.append("\\\\r"); break;
                case '\\t': sb.append("\\\\t"); break;
                default:
                    if (c < 32) sb.append(String.format("\\\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.toString();
    }

    static String toJson(Object v) {
        if (v == null) return "null";
        if (v instanceof String) return "\\"" + jsonEscape((String) v) + "\\"";
        if (v instanceof Number || v instanceof Boolean) return String.valueOf(v);
        Class<?> cls = v.getClass();
        if (cls.isArray()) {
            int n = java.lang.reflect.Array.getLength(v);
            StringBuilder sb = new StringBuilder();
            sb.append('[');
            for (int i = 0; i < n; i++) {
                if (i > 0) sb.append(',');
                sb.append(toJson(java.lang.reflect.Array.get(v, i)));
            }
            sb.append(']');
            return sb.toString();
        }
        if (v instanceof java.util.Collection) {
            StringBuilder sb = new StringBuilder();
            sb.append('[');
            boolean first = true;
            for (Object item : (java.util.Collection<?>) v) {
                if (!first) sb.append(',');
                sb.append(toJson(item));
                first = false;
            }
            sb.append(']');
            return sb.toString();
        }
        if (v instanceof java.util.Map) {
            StringBuilder sb = new StringBuilder();
            sb.append('{');
            boolean first = true;
            for (Object entryObj : ((java.util.Map<?, ?>) v).entrySet()) {
                java.util.Map.Entry<?, ?> e = (java.util.Map.Entry<?, ?>) entryObj;
                if (!first) sb.append(',');
                sb.append(toJson(String.valueOf(e.getKey())));
                sb.append(':');
                sb.append(toJson(e.getValue()));
                first = false;
            }
            sb.append('}');
            return sb.toString();
        }
        return toJson(String.valueOf(v));
    }

    public static void main(String[] args) {
        try {
            Class<?> solutionClass = Class.forName("Solution");
            Object[] rawArgs = ${argsLiteral};
            Method method = pickMethod(solutionClass.getDeclaredMethods(), rawArgs.length);
            if (method == null) {
                throw new RuntimeException("No solve(...) method found in Solution class.");
            }
            method.setAccessible(true);
            Object target = Modifier.isStatic(method.getModifiers())
                ? null
                : solutionClass.getDeclaredConstructor().newInstance();
            Object result = method.invoke(target, prepareArgs(method, rawArgs));
            System.out.print("RESULT_START" + toJson(result) + "RESULT_END");
        } catch (Throwable t) {
            Throwable root = t;
            if (root instanceof java.lang.reflect.InvocationTargetException) {
                Throwable target = ((java.lang.reflect.InvocationTargetException) root).getTargetException();
                if (target != null) root = target;
            }
            String msg = root.getMessage();
            System.err.print(msg == null ? root.toString() : msg);
            System.exit(1);
        }
    }
}
`;

  finalCode = `import java.util.*;\nimport java.io.*;\nimport java.math.*;\nimport java.lang.reflect.*;\n${finalCode}\n${runtimeWrapper}`;

  await fs.writeFile(javaFile, finalCode);
  try {
    await execPromise(`javac "${javaFile}"`);
    const { stdout, stderr } = await execPromise(`java -cp "${workDir}" __Runner`, {
      timeout,
      cwd: workDir,
    });
    const match = stdout.match(/RESULT_START(.*)RESULT_END/);
    let output = match ? match[1] : stdout.trim();
    return { success: true, output, error: stderr };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  }
}

async function runC(code, workDir, input, timeout, expectedOutput = null) {
  const cFile = path.join(workDir, "solution.c");
  const exeFile = path.join(workDir, "solution.exe");
  const inputFile = path.join(workDir, "input.json");
  await fs.writeFile(inputFile, JSON.stringify(input ?? null));
  const hasMain = /\bint\s+main\s*\(/.test(code);

  let finalCode = `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdbool.h>

${code}
`;

  if (!hasMain) {
    const entry = detectCStyleFunction(code, "solve");
    if (!entry) {
      return {
        success: false,
        error:
          "No callable C function found. Define solve(...) or one top-level function.",
      };
    }

    const args = normalizeInputArgs(input);
    const declarations = [];
    const callPieces = [];
    let firstArrayLenVar = null;
    let unsupportedInput = false;

    for (let i = 0; i < args.length; i++) {
      const value = args[i];
      const argName = `arg${i}`;

      if (Array.isArray(value)) {
        if (value.some((item) => Array.isArray(item) || typeof item === "object")) {
          unsupportedInput = true;
          break;
        }

        if (value.every((item) => typeof item === "number" || typeof item === "boolean")) {
          const isIntegral = value.every(
            (item) => typeof item === "boolean" || Number.isInteger(item),
          );
          const type = isIntegral ? "int" : "double";
          const literals = value
            .map((item) => {
              if (typeof item === "boolean") return item ? "1" : "0";
              if (isIntegral) return `${Math.trunc(Number(item) || 0)}`;
              return `${Number.isFinite(Number(item)) ? Number(item) : 0}`;
            })
            .join(",");

          declarations.push(`${type} ${argName}[] = {${literals}};`);
          declarations.push(`int ${argName}_len = ${value.length};`);
          callPieces.push({
            plain: [`${argName}`],
            expanded: [`${argName}`, `${argName}_len`],
          });
          if (!firstArrayLenVar) firstArrayLenVar = `${argName}_len`;
          continue;
        }

        if (value.every((item) => typeof item === "string")) {
          const literals = value
            .map((item) => `"${escapeForDoubleQuotedString(item)}"`)
            .join(",");
          declarations.push(`char* ${argName}[] = {${literals}};`);
          declarations.push(`int ${argName}_len = ${value.length};`);
          callPieces.push({
            plain: [`${argName}`],
            expanded: [`${argName}`, `${argName}_len`],
          });
          if (!firstArrayLenVar) firstArrayLenVar = `${argName}_len`;
          continue;
        }

        unsupportedInput = true;
        break;
      }

      if (typeof value === "string") {
        declarations.push(`char ${argName}[] = "${escapeForDoubleQuotedString(value)}";`);
        callPieces.push({ plain: [argName], expanded: [argName] });
        continue;
      }

      if (typeof value === "number") {
        if (Number.isInteger(value)) {
          declarations.push(`int ${argName} = ${Math.trunc(value)};`);
        } else {
          declarations.push(`double ${argName} = ${Number(value)};`);
        }
        callPieces.push({ plain: [argName], expanded: [argName] });
        continue;
      }

      if (typeof value === "boolean") {
        declarations.push(`int ${argName} = ${value ? 1 : 0};`);
        callPieces.push({ plain: [argName], expanded: [argName] });
        continue;
      }

      if (value === null || value === undefined) {
        declarations.push(`int ${argName} = 0;`);
        callPieces.push({ plain: [argName], expanded: [argName] });
        continue;
      }

      unsupportedInput = true;
      break;
    }

    if (unsupportedInput) {
      return {
        success: false,
        error:
          "C runner currently supports scalar and 1D array testcase inputs only.",
      };
    }

    const plainCallArgs = callPieces.flatMap((piece) => piece.plain);
    const expandedCallArgs = callPieces.flatMap((piece) => piece.expanded);
    const paramCount = Array.isArray(entry.params) ? entry.params.length : 0;
    let selectedCallArgs = expandedCallArgs;
    if (paramCount === plainCallArgs.length) {
      selectedCallArgs = plainCallArgs;
    } else if (paramCount === expandedCallArgs.length) {
      selectedCallArgs = expandedCallArgs;
    } else if (paramCount === 0) {
      selectedCallArgs = [];
    }

    const callArgs = selectedCallArgs.join(", ");
    const returnType = (entry.returnType || "int")
      .replace(/\b(static|inline|extern|register|constexpr)\b/g, "")
      .trim();
    const normalizedReturn = returnType.toLowerCase().replace(/\s+/g, "");

    let printBlock = "";
    if (normalizedReturn === "void") {
      printBlock = `printf("RESULT_STARTnullRESULT_END\\n");`;
    } else if (normalizedReturn.includes("char*")) {
      printBlock = `
    if (__result == NULL) {
        printf("RESULT_STARTnullRESULT_END\\n");
    } else {
        printf("RESULT_START%sRESULT_END\\n", __result);
    }`;
    } else if (normalizedReturn.includes("*")) {
      const outLenExpr =
        Array.isArray(expectedOutput) && expectedOutput.length >= 0
          ? `${expectedOutput.length}`
          : firstArrayLenVar || "2";
      printBlock = `
    if (__result == NULL) {
        printf("RESULT_STARTnullRESULT_END\\n");
    } else {
        int __out_len = ${outLenExpr};
        if (__out_len < 0) __out_len = 0;
        printf("RESULT_START[");
        for (int i = 0; i < __out_len; i++) {
            if (i) printf(",");
            printf("%g", (double)__result[i]);
        }
        printf("]RESULT_END\\n");
    }`;
    } else if (/\bbool\b|_bool/.test(normalizedReturn)) {
      printBlock = `printf("RESULT_START%sRESULT_END\\n", __result ? "true" : "false");`;
    } else if (
      /(unsigned|signed|int|long|short|size_t|char)/.test(normalizedReturn) &&
      !/(float|double)/.test(normalizedReturn)
    ) {
      printBlock = `printf("RESULT_START%lldRESULT_END\\n", (long long)__result);`;
    } else {
      printBlock = `printf("RESULT_START%gRESULT_END\\n", (double)__result);`;
    }

    const callStatement =
      normalizedReturn === "void"
        ? `${entry.name}(${callArgs});`
        : `${returnType} __result = ${entry.name}(${callArgs});`;

    finalCode += `
int main() {
    ${declarations.join("\n    ")}
    ${callStatement}
    ${printBlock}
    return 0;
}
`;
  }

  await fs.writeFile(cFile, finalCode);
  try {
    await execPromise(`gcc "${cFile}" -o "${exeFile}"`);
    const { stdout, stderr } = await execPromise(`"${exeFile}"`, {
      timeout,
      cwd: workDir,
    });
    const match = stdout.match(/RESULT_START(.*)RESULT_END/);
    let output = match ? match[1] : stdout.trim();
    return { success: true, output, error: stderr };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  }
}
