import { describe, expect, it } from "vitest";
import { analyzeKoreanText } from "./openaiAnalyzer";

function mockClient(content: string) {
  return {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content } }]
        })
      }
    }
  } as never;
}

describe("openaiAnalyzer", () => {
  it("parses valid structured analysis", async () => {
    const items = await analyzeKoreanText("학교에 간다. 학교가 좋다.", {
      client: mockClient(
        JSON.stringify({
          items: [
            {
              surface: "학교",
              lemma: "학교",
              pos: "명사",
              frequency: 2,
              reason: "대상 이름",
              confidence: 0.9
            }
          ]
        })
      )
    });

    expect(items[0]).toMatchObject({ surface: "학교", pos: "명사", frequency: 2 });
  });

  it("rejects unsupported POS labels", async () => {
    await expect(
      analyzeKoreanText("학교에 간다.", {
        client: mockClient(
          JSON.stringify({
            items: [{ surface: "간다", lemma: "가다", pos: "어미", frequency: 1 }]
          })
        )
      })
    ).rejects.toThrow();
  });
});
