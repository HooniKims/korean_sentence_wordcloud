import { POS_COLORS } from "./pos";
import type { AnalysisItem, AnswerKey, GradingResult, StudentChoices, StudentIdentity } from "./schemas";

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

export function buildWordcloudImagePrompt(identity: StudentIdentity, entries: WordcloudEntry[]): string {
  const words = entries
    .sort((left, right) => right.frequency - left.frequency || left.text.localeCompare(right.text, "ko"))
    .map((entry) => `${entry.text}(${entry.expected ?? entry.pos}, ${entry.frequency}회)`)
    .join(", ");

  return [
    "Gemini Nano Banana에서 사용할 이미지 생성 프롬프트입니다.",
    "",
    "정사각형 교육용 포스터 장면을 만들어 주세요. 흰색에 가까운 밝은 배경 위에 한국어 품사 학습용 워드클라우드를 중앙에 배치합니다. 전체 분위기는 깔끔하고 차분한 교실 게시물처럼 보이게 하고, 장식보다 단어의 가독성을 우선합니다.",
    "",
    `${identity.className} ${identity.studentNumber} ${identity.studentName} 학생의 결과라는 느낌이 나도록 작고 단정한 보조 문구를 넣어도 됩니다. 단, 학생 정보보다 단어들이 더 눈에 띄어야 합니다.`,
    "",
    "워드클라우드 구성 규칙:",
    "- 아래 단어를 빠뜨리지 마세요.",
    "- 단어는 한글이 또렷하게 읽히도록 표현하세요.",
    "- 빈도가 높은 단어는 더 크게, 빈도가 낮은 단어는 더 작게 배치하세요.",
    "- 품사는 단어 옆에 작은 라벨이나 색상 점으로 구분하세요.",
    "- 글자 왜곡, 흐릿한 글자, 의미 없는 임의 단어를 넣지 마세요.",
    "- JSON을 이미지에 그대로 넣지 마세요.",
    "- 표, 코드 블록, 긴 설명문처럼 보이지 않게 하세요.",
    "",
    `반드시 포함할 단어 목록: ${words}`
  ].join("\n");
}
