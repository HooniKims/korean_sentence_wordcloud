import { describe, expect, it } from "vitest";
import { analyzeKoreanText } from "./openaiAnalyzer";

function mockClient(content: string) {
  const calls: unknown[] = [];
  return {
    calls,
    chat: {
      completions: {
        create: async (params: unknown) => {
          calls.push(params);
          return {
            choices: [{ message: { content } }]
          };
        }
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

  it("uses gpt-5.4-nano for OpenAI analysis", async () => {
    const client = mockClient(
      JSON.stringify({
        items: [
          {
            surface: "학교",
            lemma: "학교",
            pos: "명사",
            frequency: 1,
            reason: "대상 이름",
            confidence: 0.9
          }
        ]
      })
    );

    await analyzeKoreanText("학교에 간다.", { client });

    expect(client.calls[0]).toMatchObject({ model: "gpt-5.4-nano" });
  });

  it("asks for only grade 7 curriculum-safe POS questions with clear original POS usage", async () => {
    const client = mockClient(
      JSON.stringify({
        items: [
          {
            surface: "학교",
            lemma: "학교",
            pos: "명사",
            frequency: 1,
            reason: "대상 이름",
            confidence: 0.9
          }
        ]
      })
    );

    await analyzeKoreanText("그 학생은 새 책을 읽었다.", { client });

    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("중학교 1학년")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("원래 품사가 원래 역할")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("문맥상 역할만으로 품사를 바꾸어 판단")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("문장 종결 표현")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("습니다")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("서술격조사")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("보조사")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("접속부사")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("용언의 활용형은 문제로 내지 않는다")
        }
      ]
    });
  });

  it("filters out predicative particle candidates even when the model returns them", async () => {
    const items = await analyzeKoreanText("저는 학생입니다. 학교에 갑니다.", {
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "학생", lemma: "학생", pos: "명사", frequency: 1, reason: "대상 이름", confidence: 0.9 },
            { surface: "입니다", lemma: "이다", pos: "조사", frequency: 1, reason: "서술격조사", confidence: 0.95 }
          ]
        })
      )
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ surface: "학생", pos: "명사" });
  });

  it("filters out conjugated predicate-form candidates even when the model returns them", async () => {
    const items = await analyzeKoreanText("예쁜 꽃이 피었습니다.", {
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "꽃", lemma: "꽃", pos: "명사", frequency: 1, reason: "대상 이름", confidence: 0.9 },
            { surface: "예쁜", lemma: "예쁘다", pos: "형용사", frequency: 1, reason: "용언의 활용형", confidence: 0.95 }
          ]
        })
      )
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ surface: "꽃", pos: "명사" });
  });

  it("normalizes broken frequency values from long AI responses", async () => {
    const items = await analyzeKoreanText("학생들이 긴 대화를 나누었습니다.", {
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "학생", lemma: "학생", pos: "명사", frequency: 0, reason: "대상 이름", confidence: 0.9 },
            { surface: "대화", lemma: "대화", pos: "명사", frequency: "many", reason: "대상 이름", confidence: 0.9 },
            { surface: "교실", lemma: "교실", pos: "명사", reason: "장소 이름", confidence: 0.9 }
          ]
        })
      )
    });

    expect(items.map((item) => item.frequency)).toEqual([1, 1, 1]);
  });

  it("keeps only the 20 most frequent safe candidates no matter how long the text is", async () => {
    const responseItems = Array.from({ length: 25 }, (_, index) => ({
      surface: `단어${index + 1}`,
      lemma: `단어${index + 1}`,
      pos: "명사",
      frequency: index + 1,
      reason: "대상 이름",
      confidence: 0.9
    }));

    const items = await analyzeKoreanText("긴 대화문입니다.".repeat(100), {
      client: mockClient(JSON.stringify({ items: responseItems }))
    });

    expect(items).toHaveLength(20);
    expect(items[0].surface).toBe("단어25");
    expect(items[19].surface).toBe("단어6");
  });

  it("filters out auxiliary particles and conjunctive adverbs", async () => {
    const items = await analyzeKoreanText("학교만 갔다. 그리고 책을 읽었다.", {
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "학교", lemma: "학교", pos: "명사", frequency: 2, reason: "대상 이름", confidence: 0.9 },
            { surface: "만", lemma: "만", pos: "조사", frequency: 2, reason: "보조사", confidence: 0.9 },
            { surface: "그리고", lemma: "그리고", pos: "부사", frequency: 2, reason: "접속부사", confidence: 0.9 }
          ]
        })
      )
    });

    expect(items).toEqual([
      expect.objectContaining({ surface: "학교", pos: "명사" })
    ]);
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
