import type { AnalysisItem, AnswerKey, GradingResult, StudentChoices } from "./schemas";

export type StudentFeedbackItem = {
  id: string;
  surface: string;
  lemma: string;
  selected: string;
  expected: string;
};

export function buildAnswerKey(items: AnalysisItem[]): AnswerKey {
  return Object.fromEntries(items.map((item) => [item.id, item.pos]));
}

export function gradeChoices(
  items: AnalysisItem[],
  choices: StudentChoices,
  answerKey: AnswerKey = buildAnswerKey(items)
): GradingResult {
  const incorrectItems = items
    .filter((item) => choices[item.id] !== answerKey[item.id])
    .map((item) => ({
      id: item.id,
      surface: item.surface,
      expected: answerKey[item.id],
      actual: choices[item.id]
    }));

  const totalCount = items.length;
  const correctCount = totalCount - incorrectItems.length;
  const score = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);

  return {
    correctCount,
    totalCount,
    score,
    incorrectItems
  };
}

export function summarizeIncorrect(result: GradingResult): string {
  if (result.incorrectItems.length === 0) {
    return "";
  }

  return result.incorrectItems
    .map((item) => `${item.surface}: ${item.actual ?? "미선택"}→${item.expected}`)
    .join(", ");
}

export function buildStudentFeedback(
  items: AnalysisItem[],
  choices: StudentChoices,
  grading: GradingResult
): StudentFeedbackItem[] {
  return grading.incorrectItems.map((incorrect) => {
    const item = items.find((candidate) => candidate.id === incorrect.id);
    return {
      id: incorrect.id,
      surface: incorrect.surface,
      lemma: item?.lemma ?? "",
      selected: choices[incorrect.id] ?? "미선택",
      expected: incorrect.expected
    };
  });
}
