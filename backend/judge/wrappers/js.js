// backend/judge/wrappers/js.js

export function wrapJS(code, input) {
  return `
${code}

function __run() {
  const args = ${JSON.stringify(input)};

  let result;

  // Object input → call by named params
  if (args && typeof args === "object" && !Array.isArray(args)) {
    result = solve(...Object.values(args));
  } else {
    result = solve(args);
  }

  if (result === undefined) result = null;

  console.log(JSON.stringify(result));
}

__run();
`;
}
