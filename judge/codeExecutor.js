// backend/judge/codeExecutor.js
import { VM } from "vm2";

/**
 * Executes JavaScript code in a sandboxed environment
 * @param {string} code - The code to execute
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<{success: boolean, output: string, error: string}>}
 */
export async function executeCode(code, timeout = 5000) {
  try {
    const vm = new VM({
      timeout: timeout,
      sandbox: {},
    });

    const output = [];

    // Wrap code to capture console.log
    const wrappedCode = `
      const console = {
        log: (...args) => {
          output.push(args.map(arg => JSON.stringify(arg)).join(' '));
        }
      };
      const output = [];
      
      ${code}
      
      output.join('\\n');
    `;

    // Execute the code
    const result = vm.run(wrappedCode);

    return {
      success: true,
      output: result || "(no output)",
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error.message || "Execution error",
    };
  }
}

/**
 * Executes code with specific input and captures output
 * This is used for test case validation
 * @param {string} code - The user's code
 * @param {Array} input - Input arguments for the function (already an array of args)
 * @returns {Promise<{success: boolean, output: any, error: string}>}
 */
export async function executeWithInput(code, input) {
  try {
    const vm = new VM({
      timeout: 5000,
      sandbox: {},
      eval: false,
      wasm: false,
    });

    // Try to extract function name from code
    const functionPatterns = [
      /function\s+(\w+)\s*\(/,
      /const\s+(\w+)\s*=\s*(?:function|\()/,
      /let\s+(\w+)\s*=\s*(?:function|\()/,
      /var\s+(\w+)\s*=\s*(?:function|\()/,
    ];

    let functionName = null;
    for (const pattern of functionPatterns) {
      const match = code.match(pattern);
      if (match) {
        functionName = match[1];
        break;
      }
    }

    if (!functionName) {
      return {
        success: false,
        output: null,
        error:
          "Could not find a function in your code. Please define a function.",
      };
    }

    // Input is an array of arguments - pass them directly
    // For example: input = [[2,7,11,15], 9] means two arguments
    const args = Array.isArray(input) ? input : [input];
    const argsStr = args.map((arg) => JSON.stringify(arg)).join(", ");

    // Build the wrapped code that defines the function and calls it
    const wrappedCode = `
${code}

// Call the function with the arguments and return result
${functionName}(${argsStr})
`;

    const result = vm.run(wrappedCode);

    return {
      success: true,
      output: result,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error.message || "Execution error",
    };
  }
}
