export function wrapPy(userCode, inputObj = {}) {
  const argNames = Object.keys(inputObj);
  const argValues = Object.values(inputObj)
    .map(v => JSON.stringify(v))
    .join(", ");

  const hasSolve = /^\s*def\s+solve\s*\(/m.test(userCode);

  // Case 1: User already defined solve()
  if (hasSolve) {
    return `
${userCode}

if __name__ == "__main__":
    try:
        result = solve(${argValues})
        print(result)
    except Exception as e:
        print(e)
`;
  }

  // Case 2: User wrote only function body
  const indented = userCode
    .split("\n")
    .map(line => "    " + line)
    .join("\n");

  return `
def solve(${argNames.join(", ")}):
${indented}

if __name__ == "__main__":
    try:
        result = solve(${argValues})
        print(result)
    except Exception as e:
        print(e)
`;
}
