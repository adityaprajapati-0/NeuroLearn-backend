// backend/judge/aiHints.js
import fetch from "node-fetch";
import { questions } from "../questionsData.js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export default async function aiHints(req, res) {
  const { code, questionId } = req.body;

  if (!questionId) {
    return res.json({ ok: false, hints: "No question selected." });
  }

  const question = questions.find((q) => String(q.id) === String(questionId));
  if (!question) {
    return res.json({ ok: false, hints: "Question not found." });
  }

  try {
    const prompt = `You are an AI coding assistant for NeuroLearn. Provide 2-3 concise, helpful hints for a student working on this problem.

**Problem:** ${question.title}
**Description:** ${question.description}

**Student's current code:**
\`\`\`
${code || "(empty)"}
\`\`\`

Provide brief, encouraging hints that guide them toward the solution without giving it away. Focus on:
- Data structures they might use
- Algorithm approaches
- Edge cases to consider
- Common mistakes to avoid

Keep it under 100 words total. Be friendly and encouraging!`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://neurolearn.app",
        "X-Title": "NeuroLearn Coding Hints",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const hints = data.choices[0].message.content;
      return res.json({ ok: true, hints });
    } else {
      return res.json({
        ok: false,
        hints:
          "💭 AI hints temporarily unavailable. Focus on the problem logic!",
      });
    }
  } catch (error) {
    console.error("AI Hints Error:", error);
    return res.json({
      ok: false,
      hints: "💡 Keep coding! Think about the problem step by step.",
    });
  }
}
