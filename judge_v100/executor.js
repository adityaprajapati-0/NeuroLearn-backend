import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { executeRemote } from "../judge/remoteExecutor.js";

const execPromise = promisify(exec);
const TEMP_DIR = path.join(process.cwd(), "temp_exec");

/**
 * Robustly extract the LAST valid JSON array or object from a string.
 * This is immune to extra output or tag mangling.
 */
function extractLastJson(text) {
  if (text === undefined || text === null) return "";
  const startTag = "RESULT_START";
  const endTag = "RESULT_END";

  if (text.includes(startTag) && text.includes(endTag)) {
    const start = text.lastIndexOf(startTag) + startTag.length;
    const end = text.lastIndexOf(endTag);
    return text.substring(start, end).trim();
  }

  const trimmed = text.trim();
  const lastBracket = Math.max(
    trimmed.lastIndexOf("]"),
    trimmed.lastIndexOf("}"),
  );
  if (lastBracket === -1) return trimmed;

  const firstBracket = Math.min(
    trimmed.indexOf("[") === -1 ? Infinity : trimmed.indexOf("["),
    trimmed.indexOf("{") === -1 ? Infinity : trimmed.indexOf("{"),
  );

  if (firstBracket !== Infinity && lastBracket > firstBracket) {
    return trimmed.substring(firstBracket, lastBracket + 1);
  }
  return trimmed;
}

const USE_REMOTE_JUDGE = false; // Set to false to use local gcc/javac and avoid outdated remote Render fallbacks

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
  const functionDecl =
    /(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(/g;
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
      paramsText === "void" || !paramsText
        ? []
        : (() => {
            const result = [];
            let current = "";
            let depth = 0;
            for (let i = 0; i < paramsText.length; i++) {
              const char = paramsText[i];
              if (char === "<") depth++;
              else if (char === ">") depth--;
              if (char === "," && depth === 0) {
                result.push(current.trim());
                current = "";
              } else {
                current += char;
              }
            }
            if (current.trim()) result.push(current.trim());
            return result;
          })().map((p) => {
            const trimmed = p.trim();
            const parts = trimmed.split(/\s+/);
            const raw = parts[parts.length - 1];
            // Extract identifier at the end (could be *name or &name)
            const nameMatch = raw.match(/([A-Za-z_]\w*)$/);
            const pName = nameMatch ? nameMatch[1] : "";
            const pType = trimmed.replace(pName, "").trim();
            return { type: pType, name: pName, raw: trimmed };
          });

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
    // Check if it's a nested array
    const first = value[0];
    const childType = inferCppType(first);
    return `std::vector<${childType}>`;
  }
  return "std::string";
}

function normalizeCppType(type) {
  return type
    .replace(/\bconst\b/g, "")
    .replace(/[&*]/g, "")
    .trim();
}

function getCppVectorInnerType(type) {
  // Handle both vector<...> and std::vector<...>
  // Also handle references/const by stripping them first
  const normalized = normalizeCppType(type);
  const match = normalized.match(/^(?:std::)?vector\s*<\s*(.*)\s*>$/);
  return match ? match[1].trim() : null;
}

function toCppValueExpr(value, type, isTopLevel = true) {
  if (value === null || value === undefined) return "0";

  // If we have an array, we must use vector initialization
  if (Array.isArray(value)) {
    let finalType = type ? normalizeCppType(type) : inferCppType(value);

    const innerType = getCppVectorInnerType(finalType);
    const body = value
      .map((v) => toCppValueExpr(v, innerType || inferCppType(v), false))
      .join(", ");

    if (isTopLevel) {
      return `${finalType}{${body}}`;
    }
    return `{${body}}`;
  }

  if (type === "std::string" || normalizeCppType(type || "") === "string")
    return `std::string("${escapeForDoubleQuotedString(value)}")`;
  if (type === "bool") return value ? "true" : "false";
  if (type === "double" || type === "float") return `${value}`;
  if (type === "long long") return `${value}LL`;
  if (typeof value === "number") return `${value}`;
  return "0";
}

export async function executeMultiLangEngine(
  code,
  language,
  input = null,
  timeout = 5000,
  expectedOutput = null,
) {
  if (USE_REMOTE_JUDGE && ["java", "cpp", "c"].includes(language)) {
    console.log(`📡 Using Remote Judge for ${language}`);
    return await executeRemote(code, language, input);
  }

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
        sys.stdout.write("RESULT_START" + json.dumps(result) + "RESULT_END")
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
    return { success: true, output: extractLastJson(stdout), error: stderr };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  }
}

async function runCpp(code, workDir, input, timeout) {
  const cppFile = path.join(workDir, "solution.cpp");
  const exeFile = path.join(workDir, "solution.exe");
  const inputFile = path.join(workDir, "input.json");
  await fs.writeFile(inputFile, JSON.stringify(input ?? null));

  const hasMain =
    /(?:^|\n)\s*(?:int|signed|auto|void|unsigned)\s+main\s*\([^)]*\)\s*\{?/.test(
      code,
    );

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
      // Map keys in input object to param names in the function signature
      args = entry.params.map((p) => {
        if (input[p.name] !== undefined) return input[p.name];
        // Heuristic: if function has 1 param and object has 1 key, maybe it's that one
        const keys = Object.keys(input);
        if (entry.params.length === 1 && keys.length === 1)
          return input[keys[0]];
        return null;
      });
    } else if (input !== null && input !== undefined) {
      args = [input];
    }

    // ARITY PADDING: If we have fewer args than the signature expects, fill with nulls
    // to avoid "too few arguments" compilation error.
    if (entry && entry.params && args.length < entry.params.length) {
      while (args.length < entry.params.length) {
        args.push(null);
      }
    }

    const declarations = args
      .map((arg, i) => {
        const inferred = inferCppType(arg);
        let rawType = entry.params[i] ? entry.params[i].type : inferred;

        // Matrix safety: only force vector<vector<...>> IF data is 2D and we have no arity match
        if (
          inferred.includes("vector<std::vector") &&
          !rawType.includes("vector<vector") &&
          !rawType.includes("vector<std::vector") &&
          (entry.params.length === 1 || !entry.params[i])
        ) {
          rawType = inferred;
        }

        const varType = normalizeCppType(rawType);
        const valueExpr = toCppValueExpr(arg, rawType);
        return `    ${varType} arg${i} = ${valueExpr};`;
      })
      .join("\n");
    const callArgs = args.map((_, i) => `arg${i}`).join(", ");

    finalCode += `
string __jsonEscape(const string& s) {
    string out;
    out.reserve(s.size() + 16);
    for (char c : s) {
        if (c == 92) { out += (char)92; out += (char)92; }
        else if (c == 34) { out += (char)92; out += (char)34; }
        else if (c == 10) { out += (char)92; out += 'n'; }
        else if (c == 13) { out += (char)92; out += 'r'; }
        else if (c == 9)  { out += (char)92; out += 't'; }
        else out += c;
    }
    return out;
}

string __toJson(...) { return "null"; }

string __toJson(const string& v) {
    return string(1, (char)34) + __jsonEscape(v) + string(1, (char)34);
}

string __toJson(const char* v) {
    return string(1, (char)34) + __jsonEscape(string(v ? v : "")) + string(1, (char)34);
}

string __toJson(char* v) {
    return string(1, (char)34) + __jsonEscape(string(v ? v : "")) + string(1, (char)34);
}

string __toJson(bool v) {
    return v ? "true" : "false";
}

template <typename T>
typename std::enable_if<std::is_integral<T>::value && !std::is_same<T, bool>::value, std::string>::type
__toJson(const T& v) {
    return std::to_string((long long)v);
}

template <typename T>
typename std::enable_if<std::is_floating_point<T>::value, std::string>::type
__toJson(const T& v) {
    std::ostringstream oss;
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
        auto result = ${entry.name}(${callArgs});
        std::cout << "RESULT_START" << __toJson(result) << "RESULT_END";
    } catch (const std::exception& e) {
        std::cerr << e.what();
        return 1;
    } catch (...) {
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
    return { success: true, output: extractLastJson(stdout), error: stderr };
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

  // Wrap Java if it doesn't have a main
  let javaArgs = [];
  if (true) {
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
        if (v instanceof String) return (char)34 + jsonEscape((String) v) + (char)34;
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
            Object target = null;
            if (!java.lang.reflect.Modifier.isStatic(method.getModifiers())) {
                try {
                    java.lang.reflect.Constructor<?> constr = solutionClass.getDeclaredConstructor();
                    constr.setAccessible(true);
                    target = constr.newInstance();
                } catch (NoSuchMethodException e) {
                    throw new RuntimeException("Class 'Solution' must have a no-argument constructor (it can be private).");
                } catch (Exception e) {
                    throw new RuntimeException("Failed to instantiate 'Solution' class: " + e.getMessage());
                }
            }
            Object result = method.invoke(target, prepareArgs(method, rawArgs));
            System.out.println("\nRESULT_START");
            System.out.println(toJson(result));
            System.out.println("RESULT_END");
            System.out.flush();
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
    const { stdout, stderr } = await execPromise(`java -cp "${workDir}" Main`, {
      timeout,
      cwd: workDir,
    });
    return { success: true, output: extractLastJson(stdout), error: stderr };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  }
}

async function runC(code, workDir, input, timeout, expectedOutput = null) {
  const cFile = path.join(workDir, "solution.c");
  const exeFile = path.join(workDir, "solution.exe");
  const inputFile = path.join(workDir, "input.json");
  await fs.writeFile(inputFile, JSON.stringify(input ?? null));
  const hasMain =
    /(?:^|\n)\s*(int|signed|auto|void|unsigned)\s+main\s*\([^)]*\)\s*\{?/.test(
      code,
    );

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
        if (
          value.some((item) => Array.isArray(item) || typeof item === "object")
        ) {
          unsupportedInput = true;
          break;
        }

        if (
          value.every(
            (item) => typeof item === "number" || typeof item === "boolean",
          )
        ) {
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
        declarations.push(
          `char ${argName}[] = "${escapeForDoubleQuotedString(value)}";`,
        );
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
        printf("null");
    } else {
        int __out_len = ${outLenExpr};
        if (__out_len < 0) __out_len = 0;
        printf("[");
        for (int i = 0; i < __out_len; i++) {
            if (i) printf(",");
            printf("%g", (double)__result[i]);
        }
        printf("]");
    }`;
    } else if (/\bbool\b|_bool/.test(normalizedReturn)) {
      printBlock = `printf("%s", __result ? "true" : "false");`;
    } else if (
      /(unsigned|signed|int|long|short|size_t|char)/.test(normalizedReturn) &&
      !/(float|double)/.test(normalizedReturn)
    ) {
      printBlock = `printf("%lld", (long long)__result);`;
    } else {
      printBlock = `printf("%g", (double)__result);`;
    }

    const callStatement =
      normalizedReturn === "void"
        ? `${entry.name}(${callArgs});`
        : `${returnType} __result = ${entry.name}(${callArgs});`;

    finalCode += `
int main() {
    ${declarations.join("\n    ")}
    ${callStatement}
    printf("\nRESULT_START\n");
    ${printBlock}
    printf("\nRESULT_END\n");
    fflush(stdout);
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
    return { success: true, output: extractLastJson(stdout), error: stderr };
  } catch (err) {
    return { success: false, error: err.stderr || err.message };
  }
}
