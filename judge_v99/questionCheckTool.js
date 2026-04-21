import { questions } from "../questionsData.js";
import { QUESTION_TESTS } from "../questions.js";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function titlesMatch(backendTitle, contextTitle) {
  const left = normalizeText(backendTitle);
  const right = normalizeText(contextTitle);
  if (!right) return true;
  if (left === right) return true;
  return left.includes(right) || right.includes(left);
}

function buildQuestionJsTestcases(entry) {
  if (!entry || typeof entry !== "object") return [];

  if (Array.isArray(entry.tests) && entry.tests.length > 0) {
    return entry.tests
      .filter(
        (test) =>
          test &&
          Object.prototype.hasOwnProperty.call(test, "input") &&
          Object.prototype.hasOwnProperty.call(test, "expected"),
      )
      .map((test) => ({
        input: test.input,
        output: test.expected,
      }));
  }

  if (
    Object.prototype.hasOwnProperty.call(entry, "input") &&
    Object.prototype.hasOwnProperty.call(entry, "output")
  ) {
    return [{ input: entry.input, output: entry.output }];
  }

  return [];
}

export function resolveQuestionCheck(questionId, questionContext = null) {
  const numericId = Number(questionId);
  if (!Number.isFinite(numericId)) {
    return {
      ok: false,
      error: "Invalid questionId for code validation.",
    };
  }

  const question = questions.find((q) => q.id === numericId);
  if (!question) {
    return {
      ok: false,
      error: `Question ${numericId} not found in backend questions data.`,
    };
  }

  if (
    questionContext &&
    questionContext.id !== undefined &&
    Number(questionContext.id) !== numericId
  ) {
    return {
      ok: false,
      error:
        "Question ID mismatch detected between Question Detail page and validator request.",
      question,
    };
  }

  const titleMismatch = Boolean(
    questionContext &&
      questionContext.title &&
      !titlesMatch(question.title, questionContext.title || ""),
  );

  const questionJsEntry = QUESTION_TESTS?.[numericId];
  const questionJsTestcases = buildQuestionJsTestcases(questionJsEntry);
  const questionsDataTestcases = Array.isArray(question.testcases)
    ? question.testcases
    : [];

  const testcases =
    questionJsTestcases.length > 0 ? questionJsTestcases : questionsDataTestcases;
  const source =
    questionJsTestcases.length > 0 ? "questions.js" : "questionsData.js";

  if (!Array.isArray(testcases) || testcases.length === 0) {
    return {
      ok: false,
      error: `No testcases found for question ${numericId}.`,
      question,
      source,
    };
  }

  return {
    ok: true,
    question,
    testcases,
    source,
    warning: titleMismatch
      ? "Question title differs between frontend and backend labels; validated by questionId."
      : null,
  };
}
