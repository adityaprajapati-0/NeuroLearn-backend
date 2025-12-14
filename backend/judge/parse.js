export function parseInput(inputStr) {
  const cleaned = inputStr
    .replace(/[a-zA-Z_]+\s*=/g, "")
    .trim();

  return eval(`[${cleaned}]`);
}

export function parseOutput(outputStr) {
  return eval(outputStr);
}
