import OpenAI from "openai";
import { getServerEnv } from "./env";
import { KOREAN_POS } from "./pos";
import { analysisItemsSchema, type AnalysisItem } from "./schemas";

type OpenAIClient = Pick<OpenAI, "chat">;

function makeOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: getServerEnv().openaiApiKey });
}

function makePrompt(transcriptText: string, maxItems: number): string {
  return [
    "너는 한국어 문법 수업을 돕는 품사 분석 보조자다.",
    "학생이 입력한 한국어 텍스트에서 한국어 9품사 학습에 적합한 단어 후보를 추려라.",
    `허용 품사는 반드시 다음 중 하나만 사용한다: ${KOREAN_POS.join(", ")}.`,
    "반복이 너무 잦지만 학습 가치가 낮은 조각은 줄이고, 품사 구분 연습에 좋은 후보를 우선한다.",
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

export async function analyzeKoreanText(
  transcriptText: string,
  options: { maxItems?: number; client?: OpenAIClient } = {}
): Promise<AnalysisItem[]> {
  const maxItems = options.maxItems ?? 35;
  const client = options.client ?? makeOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
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
      frequency: record.frequency,
      reason: record.reason ?? "",
      confidence: record.confidence ?? 0.5
    };
  });

  return analysisItemsSchema.parse(normalized);
}
