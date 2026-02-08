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

export async function executeRemote(code, language, input = null) {
  const config = LANGUAGE_CONFIG[language];
  if (!config) throw new Error(`Language ${language} not supported by Piston.`);

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
            content: code,
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
