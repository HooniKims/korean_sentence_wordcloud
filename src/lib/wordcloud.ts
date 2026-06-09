import { POS_COLORS } from "./pos";
import type { AnalysisItem, AnswerKey, GradingResult, StudentChoices } from "./schemas";

export type WordcloudEntry = {
  id: string;
  text: string;
  lemma: string;
  pos: string;
  frequency: number;
  size: number;
  color: string;
  markerColor: string;
  studentChoice?: string;
  expected?: string;
  correct?: boolean;
  reason: string;
};

export function buildWordcloudEntries(
  items: AnalysisItem[],
  choices: StudentChoices = {},
  answerKey: AnswerKey = {},
  grading?: GradingResult
): WordcloudEntry[] {
  const maxFrequency = Math.max(...items.map((item) => item.frequency), 1);
  const incorrectIds = new Set(grading?.incorrectItems.map((item) => item.id) ?? []);

  return items.map((item) => {
    const expected = answerKey[item.id] ?? item.pos;
    const studentChoice = choices[item.id];

    return {
      id: item.id,
      text: item.surface,
      lemma: item.lemma,
      pos: expected,
      frequency: item.frequency,
      size: 18 + Math.round((item.frequency / maxFrequency) * 44),
      color: "#111827",
      markerColor: POS_COLORS[expected],
      studentChoice,
      expected,
      correct: studentChoice ? !incorrectIds.has(item.id) : undefined,
      reason: item.reason
    };
  });
}
