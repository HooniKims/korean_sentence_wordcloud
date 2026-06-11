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

function transcriptWithWords(words: string[]): string {
  return `${words.join(" ")} 이 단어들이 학생 말에 들어 있습니다.`;
}

describe("openaiAnalyzer", () => {
  it("parses valid structured analysis", async () => {
    const items = await analyzeKoreanText("학교에 간다. 학교가 좋다.", {
      questionCount: 1,
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

    await analyzeKoreanText("학교에 간다.", { client, questionCount: 1 });

    expect(client.calls[0]).toMatchObject({ model: "gpt-5.4-nano" });
  });

  it("asks for only grade 7 curriculum-safe POS questions with clear original POS usage", async () => {
    const responseItems = Array.from({ length: 20 }, (_, index) => ({
      surface: `단어${index + 1}`,
      lemma: `단어${index + 1}`,
      pos: "명사",
      frequency: index + 1,
      reason: "대상 이름",
      confidence: 0.9
    }));
    const client = mockClient(
      JSON.stringify({
        items: responseItems
      })
    );

    await analyzeKoreanText(transcriptWithWords(responseItems.map((item) => item.surface)), { client });

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
          content: expect.stringContaining("한, 두처럼 체언 앞에서 꾸미는 말은 수사 문제로 내지 않는다")
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
          content: expect.stringContaining("보조사까지만")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("격조사와 접속조사는 문제로 내지 않는다")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("의존 명사")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("품사 통용")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("본용언과 보조 용언")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("정확히 20문제")
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
          content: expect.stringContaining("용언의 활용형 자체를 문제 표면형으로 내지 않는다")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("품사를 가능한 한 골고루 포함")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("목표 구성은 9품사 각각 최소 1문제 이상")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("후보가 있는 품사는 최소 1문제 이상 반드시 포함")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("명사가 많더라도 명사만으로 채우지 말고")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("관형사 후보가 있으면 놓치지 않는다")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("조사 후보는 보조사만 포함")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("감탄사 후보가 텍스트에 있으면 반드시 포함")
        }
      ]
    });
    expect(client.calls[0]).toMatchObject({
      messages: [
        {
          content: expect.stringContaining("같은 품사 문제를 길게 연속 배치하지 않는다")
        }
      ]
    });
  });

  it("filters out predicative particle candidates even when the model returns them", async () => {
    const items = await analyzeKoreanText("저는 학생입니다. 학교에 갑니다.", {
      questionCount: 1,
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

  it("replaces conjugated predicate-form candidates with their basic forms", async () => {
    const items = await analyzeKoreanText("예쁜 꽃이 피었습니다.", {
      questionCount: 2,
      random: () => 0.99,
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "꽃", lemma: "꽃", pos: "명사", frequency: 1, reason: "대상 이름", confidence: 0.9 },
            { surface: "예쁜", lemma: "예쁘다", pos: "형용사", frequency: 1, reason: "용언의 활용형", confidence: 0.95 }
          ]
        })
      )
    });

    expect(items).toHaveLength(2);
    expect(items).toEqual([
      expect.objectContaining({ surface: "꽃", pos: "명사" }),
      expect.objectContaining({ surface: "예쁘다", lemma: "예쁘다", pos: "형용사" })
    ]);
  });

  it("displays verb and adjective questions in their basic forms when the model returns conjugated surface forms", async () => {
    const items = await analyzeKoreanText("친구가 책을 읽고 마음이 따뜻했습니다.", {
      questionCount: 2,
      random: () => 0.99,
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "읽고", lemma: "읽다", pos: "동사", frequency: 1, reason: "동작을 나타냄", confidence: 0.9 },
            { surface: "따뜻했습니다", lemma: "따뜻하다", pos: "형용사", frequency: 1, reason: "상태를 나타냄", confidence: 0.9 }
          ]
        })
      )
    });

    expect(items).toEqual([
      expect.objectContaining({ surface: "읽다", lemma: "읽다", pos: "동사" }),
      expect.objectContaining({ surface: "따뜻하다", lemma: "따뜻하다", pos: "형용사" })
    ]);
  });

  it("infers basic verb forms from common spoken conjugations instead of dropping them", async () => {
    const items = await analyzeKoreanText("나는 밥을 먹었다. 친구가 운동장을 달리는 모습을 보았다.", {
      questionCount: 3,
      random: () => 0.99,
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "먹었다", lemma: "먹었다", pos: "동사", frequency: 1, reason: "종결형", confidence: 0.9 },
            { surface: "달리는", lemma: "달리는", pos: "동사", frequency: 1, reason: "관형형", confidence: 0.9 },
            { surface: "보았다", lemma: "보았다", pos: "동사", frequency: 1, reason: "용언의 활용형", confidence: 0.9 }
          ]
        })
      )
    });

    expect(items).toEqual([
      expect.objectContaining({ surface: "먹다", lemma: "먹다", pos: "동사" }),
      expect.objectContaining({ surface: "달리다", lemma: "달리다", pos: "동사" }),
      expect.objectContaining({ surface: "보다", lemma: "보다", pos: "동사" })
    ]);
  });

  it("normalizes predicate modifiers mislabeled as determiners to basic adjective questions", async () => {
    const items = await analyzeKoreanText("재미있는 이야기를 들었다. 기분이 좋았다.", {
      questionCount: 2,
      random: () => 0.99,
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "재미있는", lemma: "재미있다", pos: "관형사", frequency: 1, reason: "이야기를 직접 꾸밈", confidence: 0.9 },
            { surface: "좋았다", lemma: "좋았다", pos: "형용사", frequency: 1, reason: "상태를 나타냄", confidence: 0.9 }
          ]
        })
      )
    });

    expect(items).toEqual([
      expect.objectContaining({ surface: "재미있다", lemma: "재미있다", pos: "형용사" }),
      expect.objectContaining({ surface: "좋다", lemma: "좋다", pos: "형용사" })
    ]);
  });

  it("normalizes possessive pronoun forms to pronoun questions", async () => {
    const items = await analyzeKoreanText("저의 장래 희망은 의사입니다.", {
      questionCount: 1,
      random: () => 0.99,
      client: mockClient(
        JSON.stringify({
          items: [{ surface: "저의", lemma: "저의", pos: "관형사", frequency: 1, reason: "뒤의 말을 꾸밈", confidence: 0.9 }]
        })
      )
    });

    expect(items).toEqual([expect.objectContaining({ surface: "저", lemma: "저", pos: "대명사" })]);
  });

  it("replaces ambiguous spoken POS forms with easier middle-school display forms", async () => {
    const items = await analyzeKoreanText("두 권은 있습니다. 아! 충분히 긴 글입니다.", {
      questionCount: 3,
      random: () => 0.99,
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "두", lemma: "두", pos: "수사", frequency: 1, reason: "수량을 나타냄", confidence: 0.9 },
            { surface: "은/는", lemma: "은/는", pos: "조사", frequency: 1, reason: "보조사", confidence: 0.9 },
            { surface: "아!", lemma: "아", pos: "감탄사", frequency: 1, reason: "감정을 독립적으로 나타냄", confidence: 0.9 }
          ]
        })
      )
    });

    expect(items).toEqual([
      expect.objectContaining({ surface: "둘", lemma: "둘", pos: "수사" }),
      expect.objectContaining({ surface: "은", lemma: "은", pos: "조사" }),
      expect.objectContaining({ surface: "아", lemma: "아", pos: "감탄사" })
    ]);
  });

  it("normalizes broken frequency values from long AI responses", async () => {
    const items = await analyzeKoreanText("학생들이 교실에서 긴 대화를 나누었습니다.", {
      questionCount: 3,
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

    const items = await analyzeKoreanText(transcriptWithWords(responseItems.map((item) => item.surface)).repeat(4), {
      client: mockClient(JSON.stringify({ items: responseItems })),
      random: () => 0.99
    });

    expect(items).toHaveLength(20);
    expect(items[0].surface).toBe("단어25");
    expect(items[19].surface).toBe("단어6");
  });

  it("returns enough clear questions when fewer than 20 survive filtering", async () => {
    const responseItems = Array.from({ length: 19 }, (_, index) => ({
      surface: `단어${index + 1}`,
      lemma: `단어${index + 1}`,
      pos: "명사",
      frequency: index + 1,
      reason: "대상 이름",
      confidence: 0.9
    }));

    const items = await analyzeKoreanText(transcriptWithWords(responseItems.map((item) => item.surface)), {
      client: mockClient(JSON.stringify({ items: responseItems })),
      random: () => 0.99
    });

    expect(items).toHaveLength(19);
  });

  it("keeps POS questions balanced when one POS has many more candidates", async () => {
    const nounItems = Array.from({ length: 24 }, (_, index) => ({
      surface: `명사${index + 1}`,
      lemma: `명사${index + 1}`,
      pos: "명사",
      frequency: 100 - index,
      reason: "대상 이름",
      confidence: 0.9
    }));
    const responseItems = [
      ...nounItems,
      ...Array.from({ length: 4 }, (_, index) => ({
        surface: `동사${index + 1}`,
        lemma: `동사${index + 1}다`,
        pos: "동사",
        frequency: 10 - index,
        reason: "동작을 나타냄",
        confidence: 0.9
      })),
      ...Array.from({ length: 3 }, (_, index) => ({
        surface: `형용사${index + 1}`,
        lemma: `형용사${index + 1}다`,
        pos: "형용사",
        frequency: 9 - index,
        reason: "상태를 나타냄",
        confidence: 0.9
      })),
      { surface: "새", lemma: "새", pos: "관형사", frequency: 8, reason: "체언을 직접 꾸밈", confidence: 0.9 },
      { surface: "빨리", lemma: "빨리", pos: "부사", frequency: 8, reason: "용언을 직접 꾸밈", confidence: 0.9 },
      { surface: "만", lemma: "만", pos: "조사", frequency: 8, reason: "보조사", confidence: 0.9 }
    ];

    const items = await analyzeKoreanText(
      transcriptWithWords([
        ...nounItems.map((item) => item.surface),
        ...responseItems.filter((item) => item.pos === "동사" || item.pos === "형용사").map((item) => item.lemma),
        "새",
        "빨리",
        "학교만"
      ]),
      {
      client: mockClient(JSON.stringify({ items: responseItems })),
      random: () => 0.99
      }
    );

    expect(items).toHaveLength(20);
    expect(new Set(items.map((item) => item.pos))).toEqual(new Set(["명사", "동사", "형용사", "관형사", "부사", "조사"]));
    expect(items.filter((item) => item.pos === "명사")).toHaveLength(10);
  });

  it("supplements clear middle-school POS candidates from the transcript when the model omits them", async () => {
    const responseItems = Array.from({ length: 12 }, (_, index) => ({
      surface: `명사${index + 1}`,
      lemma: `명사${index + 1}`,
      pos: "명사",
      frequency: 20 - index,
      reason: "대상 이름",
      confidence: 0.9
    }));

    const items = await analyzeKoreanText(
      `아! 어머! 네! 나와 너와 우리는 하나 둘 셋 숫자를 말하고 새 책과 헌 공책도 보았다. 학교만 운동장까지 아주 빨리 조용히 걷다 예쁜 그림을 보았다. ${responseItems.map((item) => item.surface).join(" ")}`,
      {
        client: mockClient(JSON.stringify({ items: responseItems })),
        random: () => 0.99
      }
    );

    expect(items).toHaveLength(20);
    expect(new Set(items.map((item) => item.pos))).toEqual(new Set(["명사", "대명사", "수사", "동사", "형용사", "관형사", "부사", "조사", "감탄사"]));
  });

  it("shuffles the final POS questions instead of always returning frequency order", async () => {
    const responseItems = Array.from({ length: 20 }, (_, index) => ({
      surface: `단어${index + 1}`,
      lemma: `단어${index + 1}`,
      pos: index % 2 === 0 ? "명사" : "동사",
      frequency: 20 - index,
      reason: index % 2 === 0 ? "대상 이름" : "동작을 나타냄",
      confidence: 0.9
    }));

    const items = await analyzeKoreanText(transcriptWithWords(responseItems.map((item) => item.surface)), {
      client: mockClient(JSON.stringify({ items: responseItems })),
      random: () => 0
    });

    expect(items.map((item) => item.surface)).not.toEqual(responseItems.map((item) => item.surface));
    expect(items).toHaveLength(20);
  });

  it("does not ask the same displayed word more than once", async () => {
    const items = await analyzeKoreanText("학교에서 학교 친구들과 학교 이야기를 했다.", {
      questionCount: 2,
      random: () => 0.99,
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "학교", lemma: "학교", pos: "명사", frequency: 2, reason: "장소 이름", confidence: 0.88 },
            { surface: "학교", lemma: "학교", pos: "명사", frequency: 3, reason: "대상 이름", confidence: 0.92 },
            { surface: "친구", lemma: "친구", pos: "명사", frequency: 1, reason: "사람 이름", confidence: 0.9 }
          ]
        })
      )
    });

    expect(items.map((item) => item.surface)).toEqual(["학교", "친구"]);
    expect(items[0]).toMatchObject({ surface: "학교", frequency: 3, reason: "대상 이름" });
  });

  it("keeps only auxiliary particles for particle questions and filters out case/connective particles and conjunctive adverbs", async () => {
    const items = await analyzeKoreanText("학교만 갔다. 그리고 책을 읽었다.", {
      questionCount: 2,
      random: () => 0.99,
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "학교", lemma: "학교", pos: "명사", frequency: 2, reason: "대상 이름", confidence: 0.9 },
            { surface: "만", lemma: "만", pos: "조사", frequency: 2, reason: "보조사", confidence: 0.9 },
            { surface: "에", lemma: "에", pos: "조사", frequency: 2, reason: "격조사", confidence: 0.9 },
            { surface: "와", lemma: "와", pos: "조사", frequency: 2, reason: "접속조사", confidence: 0.9 },
            { surface: "그리고", lemma: "그리고", pos: "부사", frequency: 2, reason: "접속부사", confidence: 0.9 }
          ]
        })
      )
    });

    expect(items).toEqual([
      expect.objectContaining({ surface: "학교", pos: "명사" }),
      expect.objectContaining({ surface: "만", pos: "조사" })
    ]);
  });

  it("does not treat the ending in 지만 as the auxiliary particle 만", async () => {
    const items = await analyzeKoreanText("말은 섞였지만 책도 보았다.", {
      questionCount: 1,
      random: () => 0.99,
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "만", lemma: "만", pos: "조사", frequency: 2, reason: "보조사", confidence: 0.9 },
            { surface: "도", lemma: "도", pos: "조사", frequency: 1, reason: "보조사", confidence: 0.9 }
          ]
        })
      )
    });

    expect(items).toEqual([expect.objectContaining({ surface: "도", pos: "조사" })]);
  });

  it("filters out high-school-only and ambiguous grammar candidates", async () => {
    const items = await analyzeKoreanText("새 옷과 예쁜 꽃을 보니 이것은 좋은 일이다.", {
      questionCount: 2,
      random: () => 0.99,
      client: mockClient(
        JSON.stringify({
          items: [
            { surface: "새", lemma: "새", pos: "관형사", frequency: 3, reason: "체언을 직접 꾸미는 관형사", confidence: 0.9 },
            { surface: "꽃", lemma: "꽃", pos: "명사", frequency: 2, reason: "대상 이름", confidence: 0.9 },
            { surface: "것", lemma: "것", pos: "명사", frequency: 5, reason: "의존 명사", confidence: 0.98 },
            { surface: "예쁜", lemma: "예쁘다", pos: "형용사", frequency: 4, reason: "품사는 형용사이나 문장 성분은 관형어", confidence: 0.95 },
            { surface: "이", lemma: "이", pos: "관형사", frequency: 4, reason: "품사 통용으로 문맥상 구별 필요", confidence: 0.94 },
            { surface: "버렸다", lemma: "버리다", pos: "동사", frequency: 4, reason: "보조 용언", confidence: 0.94 },
            { surface: "철수야", lemma: "철수", pos: "감탄사", frequency: 4, reason: "독립어이지만 명사+호격조사", confidence: 0.93 }
          ]
        })
      )
    });

    expect(items.map((item) => item.surface).sort()).toEqual(["꽃", "예쁘다"]);
  });

  it("throws when there are fewer than the required number of safe questions", async () => {
    await expect(
      analyzeKoreanText("짧은 글입니다.", {
        questionCount: 2,
        client: mockClient(
          JSON.stringify({
            items: [
              { surface: "글", lemma: "글", pos: "명사", frequency: 1, reason: "대상 이름", confidence: 0.9 },
              { surface: "것", lemma: "것", pos: "명사", frequency: 5, reason: "의존 명사", confidence: 0.98 }
            ]
          })
        )
      })
    ).rejects.toThrow("중학교 수준에서 명확한 품사 문제를 최소 2개 만들 수 없습니다.");
  });

  it("rejects unsupported POS labels", async () => {
    await expect(
      analyzeKoreanText("학교에 간다.", {
        questionCount: 1,
        client: mockClient(
          JSON.stringify({
            items: [{ surface: "간다", lemma: "가다", pos: "어미", frequency: 1 }]
          })
        )
      })
    ).rejects.toThrow();
  });
});
