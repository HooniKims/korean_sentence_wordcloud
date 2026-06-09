import OpenAI from "openai";
import { getServerEnv } from "./env";
import { KOREAN_POS } from "./pos";
import { analysisItemsSchema, type AnalysisItem } from "./schemas";

type OpenAIClient = Pick<OpenAI, "chat">;

const OPENAI_ANALYSIS_MODEL = "gpt-5.4-nano";

function makeOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: getServerEnv().openaiApiKey });
}

function makePrompt(transcriptText: string, maxItems: number): string {
  return [
    "너는 한국어 문법 수업을 돕는 품사 분석 보조자다.",
    "학생이 입력한 한국어 텍스트를 먼저 분석한 뒤, 중학교 1학년 교육과정에 맞는 한국어 9품사 문제 후보만 추려라.",
    "문제 후보는 원래 품사가 원래 역할을 하는 단어로 한정한다.",
    "명사, 대명사, 수사는 대상이나 수량을 직접 가리키는 경우만 고른다.",
    "동사와 형용사는 기본형 그대로 제시해도 학생이 뜻을 쉽게 떠올릴 수 있는 쉬운 단어만 고른다.",
    "용언의 활용형은 문제로 내지 않는다. 예: 예쁜, 달리는, 먹었다, 피었습니다처럼 모양이 바뀐 말은 제외한다.",
    "관형사는 체언을 직접 꾸미는 독립 단어만 고른다.",
    "부사는 용언이나 문장 전체를 직접 꾸미는 독립 단어만 고른다.",
    "조사는 체언 뒤에 붙어 격, 보조, 접속 역할이 분명한 경우만 고른다.",
    "보조사는 아직 배우지 않았으므로 문제로 내지 않는다.",
    "접속부사는 아직 배우지 않았으므로 부사 문제로 내지 않는다.",
    "감탄사는 감정이나 부름, 대답을 독립적으로 나타내는 경우만 고른다.",
    "문맥상 역할만으로 품사를 바꾸어 판단해야 하는 단어, 품사보다 문장 성분 설명이 필요한 단어, 중학교 1학년 학생에게 논쟁적이거나 애매한 단어는 제외한다.",
    "습니다, 습니까, 요, 다처럼 문장 끝에 붙는 문장 종결 표현이나 어미 자체는 중학교 1학년 품사 문제로 내지 않는다.",
    "이다, 입니다, 입니까처럼 체언 뒤에서 서술어처럼 쓰이는 서술격조사는 아직 배우지 않았으므로 조사 문제로 내지 않는다.",
    "confidence는 중학교 1학년 학생에게 정답을 설명할 수 있는 확신도를 뜻한다. confidence가 0.8 미만일 후보는 반환하지 않는다.",
    `허용 품사는 반드시 다음 중 하나만 사용한다: ${KOREAN_POS.join(", ")}.`,
    "반복이 너무 잦지만 학습 가치가 낮은 조각은 줄이고, 품사 구분 연습에 좋은 후보를 우선한다.",
    "후보가 적어도 무리해서 늘리지 말고, 명백한 단어만 반환한다.",
    "반드시 빈도수가 높은 후보를 우선 반환한다.",
    "문장이 아무리 길어도 최종 문제는 가장 빈도수가 많은 단어 20개까지만 사용한다.",
    `최대 ${maxItems}개까지 반환한다.`,
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

function isPredicativeParticleCandidate(item: AnalysisItem): boolean {
  const text = `${item.surface} ${item.lemma} ${item.reason}`.replace(/\s+/g, "");
  return item.pos === "조사" && /(서술격조사|^이다$|이다|입니다|입니까|입니다\.|입니까\.)/.test(text);
}

function isConjugatedPredicateCandidate(item: AnalysisItem): boolean {
  const text = `${item.surface} ${item.lemma} ${item.reason}`.replace(/\s+/g, "");
  return /(용언의활용형|활용형|관형형|종결형|피었습니다|먹었다|달리는|예쁜)/.test(text);
}

function isAuxiliaryParticleCandidate(item: AnalysisItem): boolean {
  const text = `${item.surface} ${item.lemma} ${item.reason}`.replace(/\s+/g, "");
  return item.pos === "조사" && /(보조사|은\/는|만|도|까지|마저|조차|부터)/.test(text);
}

function isConjunctiveAdverbCandidate(item: AnalysisItem): boolean {
  const text = `${item.surface} ${item.lemma} ${item.reason}`.replace(/\s+/g, "");
  return item.pos === "부사" && /(접속부사|그리고|그러나|그래서|그러므로|하지만|그런데|또는|또한)/.test(text);
}

function normalizeFrequency(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 1) {
    return 1;
  }
  return Math.floor(numberValue);
}

export async function analyzeKoreanText(
  transcriptText: string,
  options: { maxItems?: number; client?: OpenAIClient } = {}
): Promise<AnalysisItem[]> {
  const maxItems = options.maxItems ?? calculateMaxItems(transcriptText);
  const client = options.client ?? makeOpenAIClient();

  const completion = await client.chat.completions.create({
    model: OPENAI_ANALYSIS_MODEL,
    messages: [
      {
        role: "user",
        content: makePrompt(transcriptText, maxItems)
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
    return {
      id: typeof record.id === "string" ? record.id : itemId(String(record.surface ?? "word"), index),
      surface: record.surface,
      lemma: record.lemma ?? "",
      pos: record.pos,
      frequency: normalizeFrequency(record.frequency),
      reason: record.reason ?? "",
      confidence: record.confidence ?? 0.5
    };
  });

  return analysisItemsSchema
    .parse(normalized)
    .filter(
      (item) =>
        !isPredicativeParticleCandidate(item) &&
        !isConjugatedPredicateCandidate(item) &&
        !isAuxiliaryParticleCandidate(item) &&
        !isConjunctiveAdverbCandidate(item)
    )
    .sort((left, right) => right.frequency - left.frequency)
    .slice(0, 20);
}
