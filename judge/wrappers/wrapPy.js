export function wrapPy(code, input) {
  return `
import json

${code}

try:
    result = solve(**${JSON.stringify(input)})
except TypeError:
    result = solve(*${JSON.stringify(Object.values(input))})

# 🔒 NEVER allow None
if result is None:
    result = null

print(json.dumps(result))
`;
}
