import fetch from "node-fetch";

const JUDGE0_BASE_URL = "https://judge0-ce.p.rapidapi.com";

/**
 * Mapping of internal language names to Judge0 Language IDs
 * Java (91), C++ (76), Python (92), C (75)
 */
const LANGUAGE_IDS = {
  java: 91,
  cpp: 76,
  python: 92,
  c: 75,
  javascript: 93,
};

export async function executeRemote(code, language, input = null) {
  const apiKey = process.env.RAPID_API_KEY;
  const apiHost = process.env.RAPID_API_HOST || "judge0-ce.p.rapidapi.com";

  if (!apiKey || apiKey === "YOUR_REAL_RAPIDAPI_KEY") {
    throw new Error("RapidAPI Key (Judge0) not configured on server.");
  }

  // Judge0 expects stdin for input. If it's a DSA problem, we might need to wrap it.
  // For now, we assume the code is self-contained or stdin-ready.
  const languageId = LANGUAGE_IDS[language];
  if (!languageId)
    throw new Error(`Language ${language} not supported by remote judge.`);

  try {
    // 1. Submit Code
    const response = await fetch(
      `${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=false`,
      {
        method: "POST",
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": apiHost,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin: input
            ? typeof input === "string"
              ? input
              : JSON.stringify(input)
            : "",
        }),
      },
    );

    const { token } = await response.json();
    if (!token) throw new Error("Failed to get submission token from Judge0.");

    // 2. Poll for Status
    let result = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const pollRes = await fetch(
        `${JUDGE0_BASE_URL}/submissions/${token}?base64_encoded=false`,
        {
          headers: {
            "x-rapidapi-key": apiKey,
            "x-rapidapi-host": apiHost,
          },
        },
      );

      result = await pollRes.json();
      const statusId = result.status?.id;

      if (statusId !== 1 && statusId !== 2) {
        // Status is no longer "In Queue" or "Processing"
        break;
      }

      // Wait 1s before polling again
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!result) throw new Error("Timed out waiting for Judge0 response.");

    // 3. Return Standardized Object
    const isSuccess = result.status?.id === 3; // "Accepted"

    return {
      success: isSuccess,
      output: result.stdout || "",
      error:
        result.stderr ||
        result.compile_output ||
        result.status?.description ||
        "Execution Error",
      remote: true,
    };
  } catch (error) {
    console.error("❌ Judge0 Remote Execution Error:", error);
    return {
      success: false,
      error: `Remote Judge Error: ${error.message}`,
    };
  }
}
