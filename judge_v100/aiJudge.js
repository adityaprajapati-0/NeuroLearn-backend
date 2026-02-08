import fetch from "node-fetch";

// Note: dotenv is already configured in server_v100.js
// Environment variables are available via process.env
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function analyzeCodeWithAI(
  code,
  language,
  questionTitle,
  questionDescription,
) {
  console.log("🤖 AI Analysis starting...");
  console.log("API Key present:", !!GROQ_API_KEY);

  if (!GROQ_API_KEY) {
    console.error("❌ Groq API Key not configured");
    return { success: false, error: "Groq API Key not configured." };
  }

  const prompt = `
You are an expert programming judge and mentor. 
Analyze the following code submitted for the problem: "${questionTitle}"
Problem Description: ${questionDescription}

Code (${language}):
\`\`\`${language}
${code}
\`\`\`

Provide a JSON response with the following structure:
{
  "success": true,
  "analysis": "A concise overview of the code quality and logic.",
  "hint": "A single, short, and subtle hint without giving away the answer.",
  "suggestions": "Actionable advice to improve or fix the code.",
  "complexity": {
    "time": "O(?)",
    "space": "O(?)"
  },
  "isLikelyCorrect": true/false
}
`;

  try {
    console.log("📡 Calling Groq API...");
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // Using faster model
          messages: [
            {
              role: "system",
              content:
                "You are a helpful coding assistant that provides structured JSON feedback.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 800,
        }),
      },
    );

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Groq API error:", errText);
      throw new Error(`Groq API returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    console.log("✅ Groq response received");

    const content = JSON.parse(data.choices[0].message.content);
    console.log("✅ Parsed JSON content");

    return { success: true, ...content };
  } catch (err) {
    console.error("❌ [GROQ ERROR]:", err.message);
    console.error("Full error:", err);
    return { success: false, error: err.message };
  }
}
