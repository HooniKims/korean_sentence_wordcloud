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

const NEUTRAL_WORD_COLOR = "#111827";
const NEUTRAL_MARKER_COLOR = "#94a3b8";
const TRANSCRIPT_WORD_LIMIT = 60;
type AnalysisLookupItem = AnalysisItem & { expected: string };

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
      color: NEUTRAL_WORD_COLOR,
      markerColor: POS_COLORS[expected],
      studentChoice,
      expected,
      correct: studentChoice ? !incorrectIds.has(item.id) : undefined,
      reason: item.reason
    };
  });
}

function normalizeTranscriptToken(token: string): string {
  const cleaned = token.replace(/[^가-힣a-zA-Z0-9]/g, "").trim();
  if (!cleaned) {
    return "";
  }

  return cleaned
    .replace(/(입니다|습니다|했어요|해요|어요|아요|고요|네요|군요|죠|요)$/g, "")
    .replace(/(에게서|에게|에서|으로|로|까지|부터|처럼|보다|만|도|은|는|이|가|을|를|와|과)$/g, "");
}

function buildAnalysisLookup(items: AnalysisItem[], answerKey: AnswerKey): Map<string, AnalysisLookupItem> {
  const lookup = new Map<string, AnalysisLookupItem>();

  for (const item of items) {
    const expected = answerKey[item.id] ?? item.pos;
    lookup.set(item.surface, { ...item, expected });
    if (item.lemma) {
      lookup.set(item.lemma, { ...item, expected });
    }
  }

  return lookup;
}

function findBasicFormMatch(token: string, lookup: Map<string, AnalysisLookupItem>): AnalysisLookupItem | undefined {
  const direct = lookup.get(token);
  if (direct) {
    return direct;
  }

  for (const item of lookup.values()) {
    const base = item.lemma || item.surface;
    if (!base.endsWith("다") || (item.expected !== "동사" && item.expected !== "형용사")) {
      continue;
    }

    const stem = base.slice(0, -1);
    if (stem.length >= 2 && token.startsWith(stem)) {
      return item;
    }
    if (base === "보다" && /^보(고|았|았고|았다|아요|면|니)?/.test(token)) {
      return item;
    }
    if (base === "걷다" && /^(걷|걸)/.test(token)) {
      return item;
    }
    if (base === "듣다" && /^들/.test(token)) {
      return item;
    }
    if (base === "예쁘다" && /^예쁜|^예쁘/.test(token)) {
      return item;
    }
  }

  return undefined;
}

function countTranscriptWords(transcriptText: string, lookup: Map<string, AnalysisLookupItem>): Array<{ text: string; frequency: number }> {
  const counts = new Map<string, number>();
  const tokens = transcriptText.match(/[가-힣a-zA-Z0-9]+/g) ?? [];

  for (const token of tokens) {
    const cleaned = token.replace(/[^가-힣a-zA-Z0-9]/g, "").trim();
    const matched = findBasicFormMatch(cleaned, lookup);
    const normalized = matched ? matched.lemma || matched.surface : normalizeTranscriptToken(token);
    if (normalized.length < 2) {
      continue;
    }
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([text, frequency]) => ({ text, frequency }))
    .sort((left, right) => right.frequency - left.frequency || left.text.localeCompare(right.text, "ko"))
    .slice(0, TRANSCRIPT_WORD_LIMIT);
}

export function buildTranscriptWordcloudEntries(
  transcriptText: string,
  items: AnalysisItem[],
  choices: StudentChoices = {},
  answerKey: AnswerKey = {},
  grading?: GradingResult
): WordcloudEntry[] {
  const lookup = buildAnalysisLookup(items, answerKey);
  const words = countTranscriptWords(transcriptText, lookup);
  const maxFrequency = Math.max(...words.map((word) => word.frequency), 1);
  const incorrectIds = new Set(grading?.incorrectItems.map((item) => item.id) ?? []);

  return words.map((word, index) => {
    const matched = lookup.get(word.text);
    const expected = matched?.expected ?? "전체 말";
    const studentChoice = matched ? choices[matched.id] : undefined;

    return {
      id: matched?.id ?? `transcript-${index + 1}`,
      text: word.text,
      lemma: matched?.lemma ?? word.text,
      pos: expected,
      frequency: word.frequency,
      size: 18 + Math.round((word.frequency / maxFrequency) * 44),
      color: NEUTRAL_WORD_COLOR,
      markerColor: expected in POS_COLORS ? POS_COLORS[expected as keyof typeof POS_COLORS] : NEUTRAL_MARKER_COLOR,
      studentChoice,
      expected,
      correct: matched && studentChoice ? !incorrectIds.has(matched.id) : undefined,
      reason: matched?.reason ?? "학생 전사문 전체에서 계산한 단어 빈도"
    };
  });
}

function buildPosFrequencySummary(entries: WordcloudEntry[]): string {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.expected || !(entry.expected in POS_COLORS)) {
      continue;
    }
    counts.set(entry.expected, (counts.get(entry.expected) ?? 0) + entry.frequency);
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ko"))
    .map(([pos, count]) => `${pos} ${count}회`)
    .join(", ");
}

export function buildWordcloudImagePrompt(identity: StudentIdentity, entries: WordcloudEntry[]): string {
  const words = entries
    .sort((left, right) => right.frequency - left.frequency || left.text.localeCompare(right.text, "ko"))
    .map((entry) => `${entry.text}(${entry.expected ?? entry.pos}, ${entry.frequency}회)`)
    .join(", ");
  const posSummary = buildPosFrequencySummary(entries);

  return [
    "Gemini Nano Banana에서 사용할 이미지 생성 프롬프트입니다.",
    "",
    "정사각형 교육용 포스터 장면을 만들어 주세요. 흰색에 가까운 밝은 배경 위에 한국어 품사 학습용 워드클라우드를 중앙에 배치합니다. 전체 실루엣은 이모지 구름처럼 아래쪽 바닥은 일자로 평평하고 위쪽만 둥글게 볼록한 모양이 되게 합니다. 단어들이 구름 덩어리 안쪽을 채우도록 배치합니다. 전체 분위기는 깔끔하고 차분한 교실 게시물처럼 보이게 하고, 장식보다 단어의 가독성을 우선합니다.",
    "",
    `${identity.studentNumber} ${identity.studentName}처럼 학번과 이름만 작고 단정한 보조 문구로 넣어도 됩니다. 반 정보와 '학생의 결과' 문구는 쓰지 마세요. 단, 학생 정보보다 단어들이 더 눈에 띄어야 합니다.`,
    "",
    "워드클라우드 구성 규칙:",
    "- 아래 단어를 빠뜨리지 마세요.",
    "- 단어는 한글이 또렷하게 읽히도록 표현하세요.",
    "- 빈도가 높은 단어는 더 크게, 빈도가 낮은 단어는 더 작게 배치하세요.",
    "- 전체 단어 배치는 아래쪽이 평평한 일자 바닥이고 위쪽이 여러 둥근 봉우리로 이어지는 구름 실루엣 안에 들어가야 합니다.",
    "- 구름 바깥으로 단어가 흩어지지 않게 하고, 가장자리 단어도 구름 윤곽을 만들도록 배치하세요.",
    "- 품사가 있는 단어는 단어 옆에 작은 라벨이나 색상 점으로 구분하고, 품사가 없는 전체 전사 단어는 중립 색상으로 자연스럽게 섞으세요.",
    "- 품사별 사용 횟수 요약을 작은 범례로 넣으세요.",
    "- 글자 왜곡, 흐릿한 글자, 의미 없는 임의 단어를 넣지 마세요.",
    "- JSON을 이미지에 그대로 넣지 마세요.",
    "- 표, 코드 블록, 긴 설명문처럼 보이지 않게 하세요.",
    "",
    posSummary ? `품사별 사용 횟수 요약: ${posSummary}` : "품사별 사용 횟수 요약: 품사 라벨이 있는 단어 없음",
    "",
    `반드시 포함할 단어 목록: ${words}`
  ].join("\n");
}
