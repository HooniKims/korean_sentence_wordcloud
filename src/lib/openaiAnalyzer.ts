import OpenAI from "openai";
import { getServerEnv } from "./env";
import { KOREAN_POS, type KoreanPos } from "./pos";
import { analysisItemsSchema, type AnalysisItem } from "./schemas";

type OpenAIClient = Pick<OpenAI, "chat">;

const OPENAI_ANALYSIS_MODEL = "gpt-5.4-nano";
const MINIMUM_QUESTION_COUNT = 12;
const MINIMUM_CONFIDENCE = 0.8;
const STANDARD_POS_OVERRIDES: Record<string, KoreanPos> = {
  "잘생기다": "형용사",
  "못생기다": "형용사"
};
const ALLOWED_PARTICLES = new Set(["은", "는", "이", "가", "을", "를", "에", "와"]);
const SUPPLEMENTAL_CANDIDATES: Array<{
  surface: string;
  lemma: string;
  pos: KoreanPos;
  pattern: RegExp;
  reason: string;
}> = [
  { surface: "나", lemma: "나", pos: "대명사", pattern: /(^|[\s,.!?])나($|[\s,.!?])/g, reason: "사람을 대신 가리키는 말" },
  { surface: "너", lemma: "너", pos: "대명사", pattern: /(^|[\s,.!?])너($|[\s,.!?])/g, reason: "사람을 대신 가리키는 말" },
  { surface: "우리", lemma: "우리", pos: "대명사", pattern: /우리/g, reason: "사람을 대신 가리키는 말" },
  { surface: "하나", lemma: "하나", pos: "수사", pattern: /하나/g, reason: "수량을 나타내는 말" },
  { surface: "둘", lemma: "둘", pos: "수사", pattern: /둘/g, reason: "수량을 나타내는 말" },
  { surface: "셋", lemma: "셋", pos: "수사", pattern: /셋/g, reason: "수량을 나타내는 말" },
  { surface: "읽다", lemma: "읽다", pos: "동사", pattern: /읽다/g, reason: "동작을 나타내는 말" },
  { surface: "쓰다", lemma: "쓰다", pos: "동사", pattern: /쓰다/g, reason: "동작을 나타내는 말" },
  { surface: "걷다", lemma: "걷다", pos: "동사", pattern: /걷다/g, reason: "동작을 나타내는 말" },
  { surface: "예쁘다", lemma: "예쁘다", pos: "형용사", pattern: /예쁘다|예쁜/g, reason: "상태나 성질을 나타내는 말" },
  { surface: "크다", lemma: "크다", pos: "형용사", pattern: /크다/g, reason: "상태나 성질을 나타내는 말" },
  { surface: "작다", lemma: "작다", pos: "형용사", pattern: /작다/g, reason: "상태나 성질을 나타내는 말" },
  { surface: "새", lemma: "새", pos: "관형사", pattern: /새\s+[가-힣]+/g, reason: "체언을 직접 꾸미는 말" },
  { surface: "헌", lemma: "헌", pos: "관형사", pattern: /헌\s+[가-힣]+/g, reason: "체언을 직접 꾸미는 말" },
  { surface: "아주", lemma: "아주", pos: "부사", pattern: /아주/g, reason: "용언을 직접 꾸미는 말" },
  { surface: "빨리", lemma: "빨리", pos: "부사", pattern: /빨리/g, reason: "용언을 직접 꾸미는 말" },
  { surface: "조용히", lemma: "조용히", pos: "부사", pattern: /조용히/g, reason: "용언을 직접 꾸미는 말" },
  { surface: "아", lemma: "아", pos: "감탄사", pattern: /(^|[\s,.!?])아[!,.]?(?=$|[\s,.!?])/g, reason: "감정을 독립적으로 나타내는 말" },
  { surface: "어머", lemma: "어머", pos: "감탄사", pattern: /어머[!,.]?(?=$|[\s,.!?])/g, reason: "감정을 독립적으로 나타내는 말" },
  { surface: "네", lemma: "네", pos: "감탄사", pattern: /(^|[\s,.!?])네[!,.]?(?=$|[\s,.!?])/g, reason: "대답을 독립적으로 나타내는 말" }
];

function makeOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: getServerEnv().openaiApiKey });
}

function makePrompt(transcriptText: string, questionCount: number): string {
  return [
    "너는 한국어 문법 수업을 돕는 품사 분석 보조자다.",
    "학생이 입력한 한국어 텍스트를 먼저 분석한 뒤, 중학교 1학년 교육과정에 맞는 한국어 9품사 문제 후보만 추려라.",
    "중학교 문법은 단어의 기본 의미와 쉬운 꾸밈 관계로 품사를 확인하는 수준이다. 고등학교 문법처럼 문장 구조, 제약, 품사 통용, 형태소 분석, 문장 성분을 따져야 하는 문제는 내지 않는다.",
    "문제 후보는 원래 품사가 원래 역할을 하는 단어로 한정한다.",
    "명사, 대명사, 수사는 대상이나 수량을 직접 가리키는 경우만 고른다. 의존 명사(것, 바, 줄, 수 등)와 품사 통용으로 문맥 판단이 필요한 말은 제외한다.",
    "수사는 하나, 둘, 셋처럼 독립적으로 수량 이름을 나타내는 말만 고른다. 한, 두처럼 체언 앞에서 꾸미는 말은 수사 문제로 내지 않는다.",
    "동사와 형용사는 기본형 그대로 제시해도 학생이 뜻을 쉽게 떠올릴 수 있는 쉬운 단어만 고른다.",
    "잘생기다, 못생기다는 한국어 품사 기준에서 형용사다. 동사로 내지 않는다.",
    "동사와 형용사 후보는 surface와 lemma를 모두 기본형으로 반환한다. 예: 읽고가 아니라 읽다, 예쁜이 아니라 예쁘다.",
    "용언의 활용형 자체를 문제 표면형으로 내지 않는다. 예: 예쁜, 달리는, 먹었다, 피었습니다처럼 모양이 바뀐 말은 surface에 쓰지 않는다.",
    "어미 대입, 불규칙 활용, 본용언과 보조 용언 구별이 필요한 말은 고등학교 수준이므로 제외한다.",
    "관형사는 품사 자체가 관형사인 독립 단어만 고른다. 문장 성분인 관형어를 문제로 내지 않는다.",
    "부사는 품사 자체가 부사인 독립 단어만 고른다. 문장 성분인 부사어를 문제로 내지 않는다.",
    "품사와 문장 성분을 분리해야 하는 문제는 고등학교 수준이므로 제외한다.",
    "조사 문제는 은, 는, 이, 가, 을, 를, 에, 와만 낸다.",
    "만, 도, 까지 등 허용 목록 밖의 조사는 문제로 내지 않는다.",
    "접속부사는 아직 배우지 않았으므로 부사 문제로 내지 않는다.",
    "감탄사는 감정이나 부름, 대답을 독립적으로 나타내는 순수 감탄사만 고른다.",
    "감탄사 후보가 텍스트에 있으면 반드시 포함한다. 예: 아, 어머, 네처럼 독립적으로 나온 말.",
    "감탄사와 독립어를 구별해야 하는 말, 명사+호격조사 형태(예: 철수야)는 고등학교 수준이므로 제외한다.",
    "문맥상 역할만으로 품사를 바꾸어 판단해야 하는 단어, 품사보다 문장 성분 설명이 필요한 단어, 중학교 1학년 학생에게 논쟁적이거나 애매한 단어는 제외한다.",
    "습니다, 습니까, 요, 다처럼 문장 끝에 붙는 문장 종결 표현이나 어미 자체는 중학교 1학년 품사 문제로 내지 않는다.",
    "이다, 입니다, 입니까처럼 체언 뒤에서 서술어처럼 쓰이는 서술격조사는 아직 배우지 않았으므로 조사 문제로 내지 않는다.",
    "confidence는 중학교 1학년 학생에게 정답을 설명할 수 있는 확신도를 뜻한다. confidence가 0.8 미만일 후보는 반환하지 않는다.",
    `허용 품사는 반드시 다음 중 하나만 사용한다: ${KOREAN_POS.join(", ")}.`,
    "20문제 안에는 학생 글에서 명확히 찾을 수 있는 품사를 가능한 한 골고루 포함한다.",
    "목표 구성은 9품사 각각 최소 1문제 이상 포함하고, 남은 11문제를 명확도와 빈도로 채우는 것이다.",
    "먼저 9품사 각각에 대해 중학교 수준의 명확한 후보를 찾고, 후보가 있는 품사는 최소 1문제 이상 반드시 포함한다.",
    "그 다음 남은 문항을 빈도와 확신도가 높은 후보로 채운다.",
    "명사가 많더라도 명사만으로 채우지 말고, 대명사, 수사, 동사, 형용사, 관형사, 부사, 조사, 감탄사 후보가 명확하면 함께 넣는다.",
    "관형사 후보가 있으면 놓치지 않는다. 예: 새 책, 헌 공책처럼 체언 앞에서 직접 꾸미는 독립 단어.",
    "조사 후보는 은, 는, 이, 가, 을, 를, 에, 와 중 하나만 포함한다.",
    "한 품사 후보가 충분히 많아도 다른 품사의 명확한 후보가 있으면 그 후보를 우선 포함한다.",
    "items 배열의 순서는 품사별로 섞어서 반환한다. 같은 품사 문제를 길게 연속 배치하지 않는다.",
    "같은 surface 단어를 두 번 이상 반환하지 않는다.",
    "정답이 두 품사로 갈릴 수 있거나 설명이 길어지는 단어는 애매한 단어이므로 제외한다.",
    "반드시 빈도수가 높은 후보를 우선 반환한다.",
    `items 배열은 정확히 ${questionCount}문제여야 한다.`,
    "학생 텍스트에서 명확한 후보가 부족하면 억지로 만들지 말고, 가장 명확한 후보만 반환한다.",
    "반드시 JSON 객체만 반환한다. 형식: {\"items\":[{\"surface\":\"학교\",\"lemma\":\"학교\",\"pos\":\"명사\",\"frequency\":2,\"reason\":\"대상 이름을 나타냄\",\"confidence\":0.91}]}",
    "",
    "학생 텍스트:",
    transcriptText
  ].join("\n");
}

function itemId(surface: string, index: number): string {
  return `${surface}-${index + 1}`.replace(/\s+/g, "_");
}

function calculateMaxItems(transcriptText: string): number {
  const sentenceCount = transcriptText.split(/[.!?。！？\n]+/).filter((sentence) => sentence.trim().length > 0).length;
  const lengthBucket = Math.ceil(transcriptText.trim().length / 25);
  return Math.max(12, Math.min(60, Math.max(sentenceCount * 7, lengthBucket * 4)));
}

function defaultCandidateLimit(questionCount: number): number {
  return Math.max(questionCount, 40);
}

function isPredicativeParticleCandidate(item: AnalysisItem): boolean {
  const text = `${item.surface} ${item.lemma} ${item.reason}`.replace(/\s+/g, "");
  return item.pos === "조사" && /(서술격조사|^이다$|이다|입니다|입니까|입니다\.|입니까\.)/.test(text);
}

function isConjugatedPredicateCandidate(item: AnalysisItem): boolean {
  const text = `${item.surface} ${item.lemma} ${item.reason}`.replace(/\s+/g, "");
  const canBeReplacedWithBasicForm = (item.pos === "동사" || item.pos === "형용사") && item.lemma.trim().endsWith("다");
  if (canBeReplacedWithBasicForm && !/(어미대입|불규칙활용|본용언|보조용언|보조동사|보조형용사)/.test(text)) {
    return false;
  }

  return /(용언의활용형|활용형|관형형|종결형|어미대입|불규칙활용|본용언|보조용언|보조동사|보조형용사|피었습니다|먹었다|달리는|예쁜|버렸다)/.test(text);
}

function isUntaughtParticleCandidate(item: AnalysisItem): boolean {
  return item.pos === "조사" && !ALLOWED_PARTICLES.has(item.surface.trim());
}

function isConjunctiveAdverbCandidate(item: AnalysisItem): boolean {
  const text = `${item.surface} ${item.lemma} ${item.reason}`.replace(/\s+/g, "");
  return item.pos === "부사" && /(접속부사|그리고|그러나|그래서|그러므로|하지만|그런데|또는|또한)/.test(text);
}

function isDependentNounCandidate(item: AnalysisItem): boolean {
  const text = `${item.surface} ${item.lemma} ${item.reason}`.replace(/\s+/g, "");
  return item.pos === "명사" && /(의존명사|^것$|^바$|^줄$|^수$|^만큼$)/.test(text);
}

function isAmbiguousHighSchoolCandidate(item: AnalysisItem): boolean {
  const text = `${item.surface} ${item.lemma} ${item.reason}`.replace(/\s+/g, "");
  return (
    /(품사통용|문장성분|관형어|부사어|독립어|형태소분석|어간|어미|문맥상구별|문맥판단|고등학교수준|명사\+호격조사|호격조사)/.test(text) ||
    (item.pos === "수사" && /^(한|두)$/.test(item.surface.trim()))
  );
}

function isSafeMiddleSchoolCandidate(item: AnalysisItem): boolean {
  return (
    !isPredicativeParticleCandidate(item) &&
    !isConjugatedPredicateCandidate(item) &&
    !isUntaughtParticleCandidate(item) &&
    !isConjunctiveAdverbCandidate(item) &&
    !isDependentNounCandidate(item) &&
    !isAmbiguousHighSchoolCandidate(item)
  );
}

function normalizeFrequency(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 1) {
    return 1;
  }
  return Math.floor(numberValue);
}

function isLikelyConjugatedPredicate(word: string): boolean {
  return /(았다|었다|였다|했다|았다|먹었다|보았다|갔다|왔다|했다|습니다|습니까|어요|아요|는|은|ㄴ|고)$/.test(word);
}

function inferPredicateLemma(surface: string, pos: unknown): string {
  if (pos !== "동사" && pos !== "형용사") {
    return "";
  }

  const word = surface.trim().replace(/[.!?]+$/g, "");
  if (!word) {
    return "";
  }

  const known: Record<string, string> = {
    먹었다: "먹다",
    먹었어요: "먹다",
    보았다: "보다",
    봤다: "보다",
    봤어요: "보다",
    갔다: "가다",
    갔어요: "가다",
    왔다: "오다",
    왔어요: "오다",
    했다: "하다",
    했어요: "하다",
    읽었다: "읽다",
    읽었어요: "읽다",
    썼다: "쓰다",
    썼어요: "쓰다",
    들었다: "듣다",
    들었어요: "듣다",
    걸었다: "걷다",
    걸었어요: "걷다",
    예뻤다: "예쁘다",
    예뻤어요: "예쁘다"
  };
  if (known[word]) {
    return known[word];
  }

  const rules: Array<[RegExp, string]> = [
    [/^(.+)하는$/, "$1하다"],
    [/^(.+)했다$/, "$1하다"],
    [/^(.+)했어요$/, "$1하다"],
    [/^(.+)하였다$/, "$1하다"],
    [/^(.+)하였습니다$/, "$1하다"],
    [/^(.+)했습니다$/, "$1하다"],
    [/^(.+)이었다$/, "$1이다"],
    [/^(.+)였다$/, "$1이다"],
    [/^(.+)았다$/, "$1다"],
    [/^(.+)었다$/, "$1다"],
    [/^(.+)였어요$/, "$1이다"],
    [/^(.+)았어요$/, "$1다"],
    [/^(.+)었어요$/, "$1다"],
    [/^(.+)습니다$/, "$1다"],
    [/^(.+)어요$/, "$1다"],
    [/^(.+)아요$/, "$1다"],
    [/^(.+)는다$/, "$1다"],
    [/^(.+)ㄴ다$/, "$1다"],
    [/^(.+)고$/, "$1다"],
    [/^(.+)는$/, "$1다"],
    [/^(.+)은$/, "$1다"],
    [/^(.+)ㄴ$/, "$1다"]
  ];

  for (const [pattern, replacement] of rules) {
    const lemma = word.replace(pattern, replacement);
    if (lemma !== word && lemma.length >= 2 && lemma.endsWith("다")) {
      return lemma;
    }
  }

  return "";
}

function normalizeDisplayedPos(record: Record<string, unknown>, surface: string): unknown {
  const lemma = typeof record.lemma === "string" ? record.lemma.trim() : "";
  const standardPos = STANDARD_POS_OVERRIDES[surface.trim()] ?? STANDARD_POS_OVERRIDES[lemma];
  if (standardPos) {
    return standardPos;
  }

  if (/^(저|나|너|우리)의$/.test(surface.trim()) || /^(저|나|너|우리)의$/.test(lemma)) {
    return "대명사";
  }
  if (record.pos === "관형사" && (lemma.endsWith("다") || surface.endsWith("다"))) {
    return "형용사";
  }

  return record.pos;
}

function normalizeDisplayedSurface(record: Record<string, unknown>): string {
  const surface = String(record.surface ?? "word");
  const lemma = typeof record.lemma === "string" ? record.lemma.trim() : "";
  const normalizedPos = normalizeDisplayedPos(record, surface);
  const inferredLemma = lemma.endsWith("다") && !isLikelyConjugatedPredicate(lemma) ? lemma : inferPredicateLemma(surface, normalizedPos) || inferPredicateLemma(lemma, normalizedPos);
  const pos = normalizedPos;

  if ((pos === "동사" || pos === "형용사") && inferredLemma.endsWith("다")) {
    return inferredLemma;
  }

  const possessivePronoun = surface.trim().match(/^(저|나|너|우리)의$/);
  if (possessivePronoun) {
    return possessivePronoun[1];
  }

  if (pos === "수사") {
    const numberReplacements: Record<string, string> = {
      한: "하나",
      두: "둘",
      세: "셋",
      네: "넷"
    };
    return numberReplacements[surface.trim()] ?? surface;
  }

  if (pos === "조사") {
    const particleReplacements: Record<string, string> = {
      "은/는": "은",
      "이/가": "이",
      "을/를": "을"
    };
    return particleReplacements[surface.trim()] ?? surface.replace(/[.!?]+$/g, "");
  }

  if (pos === "감탄사") {
    return surface.replace(/[.!?]+$/g, "");
  }

  return surface;
}

function normalizeDisplayedLemma(record: Record<string, unknown>, surface: string): string {
  const lemma = typeof record.lemma === "string" ? record.lemma.trim() : "";
  const pos = record.pos;

  if (/^(저|나|너|우리)$/.test(surface)) {
    return surface;
  }

  if ((pos === "동사" || pos === "형용사") && surface.endsWith("다")) {
    return surface;
  }

  if (pos === "수사" && /^(하나|둘|셋|넷)$/.test(surface)) {
    return surface;
  }

  if ((pos === "조사" || pos === "감탄사") && surface) {
    return surface;
  }

  return lemma;
}

function countMatches(text: string, pattern: RegExp): number {
  return Array.from(text.matchAll(pattern)).length;
}

function buildSupplementalItems(transcriptText: string, startIndex: number): AnalysisItem[] {
  return SUPPLEMENTAL_CANDIDATES.flatMap((candidate, index) => {
    const frequency = countMatches(transcriptText, candidate.pattern);
    if (frequency < 1) {
      return [];
    }

    return [
      {
        id: itemId(`보충-${candidate.surface}`, startIndex + index),
        surface: candidate.surface,
        lemma: candidate.lemma,
        pos: candidate.pos,
        frequency,
        reason: candidate.reason,
        confidence: 0.86
      }
    ];
  });
}

function isGroundedInTranscript(item: AnalysisItem, transcriptText: string): boolean {
  const text = transcriptText.replace(/\s+/g, " ");
  const surface = item.surface.trim();
  const lemma = item.lemma.trim();

  if (item.pos !== "조사" && item.pos !== "감탄사" && item.pos !== "수사" && text.includes(surface)) {
    return true;
  }
  if (item.pos !== "조사" && item.pos !== "감탄사" && item.pos !== "수사" && lemma && text.includes(lemma)) {
    return true;
  }

  if (item.pos === "수사") {
    const numberPatterns: Record<string, RegExp> = {
      하나: /(^|[\s,.!?])(하나|한)(?=$|[\s,.!?])/,
      둘: /(^|[\s,.!?])(둘|두)(?=$|[\s,.!?])/,
      셋: /(^|[\s,.!?])(셋|세)(?=$|[\s,.!?])/,
      넷: /(^|[\s,.!?])(넷|네)(?=$|[\s,.!?])/
    };
    return Boolean(numberPatterns[surface]?.test(text));
  }

  if (item.pos === "조사") {
    const particlePatterns: Record<string, RegExp> = {
      은: /[가-힣](은|는)(?=$|[\s,.!?])/,
      는: /[가-힣](은|는)(?=$|[\s,.!?])/,
      이: /[가-힣](이|가)(?=$|[\s,.!?])/,
      가: /[가-힣](이|가)(?=$|[\s,.!?])/,
      을: /[가-힣](을|를)(?=$|[\s,.!?])/,
      를: /[가-힣](을|를)(?=$|[\s,.!?])/,
      에: /[가-힣]에(?=$|[\s,.!?])/,
      와: /[가-힣]와(?=$|[\s,.!?])/
    };
    return Boolean(particlePatterns[surface]?.test(text));
  }

  if (item.pos === "감탄사") {
    return new RegExp(`(^|[\\s,.!?])${surface}[!,.]?(?=$|[\\s,.!?])`).test(text);
  }

  if ((item.pos === "동사" || item.pos === "형용사") && surface.endsWith("다")) {
    if (surface === "잘생기다" && /잘생겼|잘생긴|잘생기/.test(text)) {
      return true;
    }
    if (surface === "못생기다" && /못생겼|못생긴|못생기/.test(text)) {
      return true;
    }

    const stem = surface.slice(0, -1);
    if (stem && text.includes(stem)) {
      return true;
    }
    if (stem.endsWith("하") && text.includes(stem.slice(0, -1))) {
      return true;
    }
    if (surface === "예쁘다" && /예쁜|예쁘/.test(text)) {
      return true;
    }
    return surface === "걷다" && /걷|걸/.test(text);
  }

  return false;
}

function wordKey(item: AnalysisItem): string {
  return item.surface.trim().replace(/\s+/g, " ");
}

function preferCandidate(left: AnalysisItem, right: AnalysisItem): AnalysisItem {
  if (right.frequency !== left.frequency) {
    return right.frequency > left.frequency ? right : left;
  }

  return right.confidence > left.confidence ? right : left;
}

function dedupeByDisplayedWord(items: AnalysisItem[]): AnalysisItem[] {
  const deduped = new Map<string, AnalysisItem>();

  for (const item of items) {
    const key = wordKey(item);
    const current = deduped.get(key);
    deduped.set(key, current ? preferCandidate(current, item) : item);
  }

  return Array.from(deduped.values());
}

function selectBalancedItems(items: AnalysisItem[], questionCount: number): AnalysisItem[] {
  const groups = new Map<KoreanPos, AnalysisItem[]>();

  for (const pos of KOREAN_POS) {
    groups.set(pos, []);
  }

  for (const item of items) {
    groups.get(item.pos)?.push(item);
  }

  for (const group of groups.values()) {
    group.sort((left, right) => right.frequency - left.frequency || right.confidence - left.confidence);
  }

  const selected: AnalysisItem[] = [];
  while (selected.length < questionCount) {
    let addedThisRound = false;

    for (const pos of KOREAN_POS) {
      const next = groups.get(pos)?.shift();
      if (!next) {
        continue;
      }

      selected.push(next);
      addedThisRound = true;

      if (selected.length === questionCount) {
        break;
      }
    }

    if (!addedThisRound) {
      break;
    }
  }

  return selected;
}

function shuffleItems(items: AnalysisItem[], random: () => number): AnalysisItem[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export async function analyzeKoreanText(
  transcriptText: string,
  options: { maxItems?: number; questionCount?: number; client?: OpenAIClient; random?: () => number } = {}
): Promise<AnalysisItem[]> {
  const questionCount = options.questionCount ?? 20;
  const maxItems = options.maxItems ?? Math.max(calculateMaxItems(transcriptText), defaultCandidateLimit(questionCount));
  const client = options.client ?? makeOpenAIClient();

  const completion = await client.chat.completions.create({
    model: OPENAI_ANALYSIS_MODEL,
    messages: [
      {
        role: "user",
        content: makePrompt(transcriptText, questionCount)
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenAI returned an empty analysis.");
  }

  const parsed = JSON.parse(content) as { items?: unknown[] };
  const normalized = (parsed.items ?? []).slice(0, maxItems).map((item, index) => {
    const record = item as Record<string, unknown>;
    const surface = normalizeDisplayedSurface(record);
    const lemma = normalizeDisplayedLemma(record, surface);
    const pos = normalizeDisplayedPos(record, surface);
    return {
      id: typeof record.id === "string" ? record.id : itemId(surface, index),
      surface,
      lemma,
      pos,
      frequency: normalizeFrequency(record.frequency),
      reason: record.reason ?? "",
      confidence: record.confidence ?? 0.5
    };
  });

  const supplemented = [...buildSupplementalItems(transcriptText, normalized.length), ...normalized].slice(0, 60);
  const safeItems = analysisItemsSchema
    .parse(supplemented)
    .filter((item) => isGroundedInTranscript(item, transcriptText))
    .filter((item) => item.confidence >= MINIMUM_CONFIDENCE)
    .filter(isSafeMiddleSchoolCandidate);

  const selectedItems = selectBalancedItems(dedupeByDisplayedWord(safeItems), questionCount);
  const minimumQuestionCount = Math.min(questionCount, MINIMUM_QUESTION_COUNT);

  if (selectedItems.length < minimumQuestionCount) {
    throw new Error(`중학교 수준에서 명확한 품사 문제를 최소 ${minimumQuestionCount}개 만들 수 없습니다.`);
  }

  return shuffleItems(selectedItems, options.random ?? Math.random);
}
