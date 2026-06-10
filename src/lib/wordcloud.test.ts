import { describe, expect, it } from "vitest";
import { buildTranscriptWordcloudEntries, buildWordcloudEntries, buildWordcloudImagePrompt } from "./wordcloud";

describe("wordcloud", () => {
  it("builds black words with POS marker colors and frequency-based size", () => {
    const entries = buildWordcloudEntries([
      { id: "w1", surface: "학교", lemma: "학교", pos: "명사", frequency: 1, reason: "", confidence: 1 },
      { id: "w2", surface: "달리다", lemma: "달리다", pos: "동사", frequency: 4, reason: "", confidence: 1 }
    ]);

    expect(entries[0].color).toBe("#111827");
    expect(entries[0].markerColor).toBe("#2563eb");
    expect(entries[1].size).toBeGreaterThan(entries[0].size);
  });

  it("builds a Nano Banana-friendly Korean image-generation prompt from wordcloud entries", () => {
    const entries = buildWordcloudEntries([
      { id: "w1", surface: "학교", lemma: "학교", pos: "명사", frequency: 2, reason: "대상 이름", confidence: 1 },
      { id: "w2", surface: "달리다", lemma: "달리다", pos: "동사", frequency: 1, reason: "움직임", confidence: 1 }
    ]);

    const prompt = buildWordcloudImagePrompt(
      { className: "1반", studentNumber: "1000", studentName: "김민수" },
      entries
    );

    expect(prompt).toContain("김민수");
    expect(prompt).toContain("1000 김민수");
    expect(prompt).toContain("반 정보와 '학생의 결과' 문구는 쓰지 마세요");
    expect(prompt).not.toContain("학생의 결과라는 느낌");
    expect(prompt).not.toContain("1반 1000");
    expect(prompt).toContain("학교(명사, 2회)");
    expect(prompt).toContain("달리다(동사, 1회)");
    expect(prompt).toContain("품사별 사용 횟수 요약: 명사 2회, 동사 1회");
    expect(prompt).toContain("Gemini Nano Banana");
    expect(prompt).toContain("교육용 포스터 장면");
    expect(prompt).toContain("정사각형");
    expect(prompt).toContain("이모지 구름처럼 아래쪽 바닥은 일자로 평평");
    expect(prompt).toContain("구름 바깥으로 단어가 흩어지지 않게");
    expect(prompt).toContain("단어를 빠뜨리지 마세요");
    expect(prompt).toContain("JSON을 이미지에 그대로 넣지 마세요");
  });

  it("builds wordcloud entries from the full transcript instead of only the selected questions", () => {
    const entries = buildTranscriptWordcloudEntries(
      "학교 학교 학교 친구 친구 운동장 도서관",
      [
        { id: "w1", surface: "친구", lemma: "친구", pos: "명사", frequency: 1, reason: "", confidence: 1 }
      ],
      { w1: "명사" }
    );

    expect(entries.map((entry) => `${entry.text}:${entry.frequency}`)).toContain("학교:3");
    expect(entries.map((entry) => `${entry.text}:${entry.frequency}`)).toContain("친구:2");
    expect(entries.map((entry) => `${entry.text}:${entry.frequency}`)).toContain("운동장:1");
    expect(entries.find((entry) => entry.text === "학교")?.pos).toBe("전체 말");
    expect(entries.find((entry) => entry.text === "친구")?.pos).toBe("명사");
  });

  it("keeps transcript word size based on full-speech frequency", () => {
    const entries = buildTranscriptWordcloudEntries("학교 학교 학교 도서관", []);

    expect(entries.find((entry) => entry.text === "학교")?.size).toBeGreaterThan(entries.find((entry) => entry.text === "도서관")?.size ?? 0);
  });

  it("merges spoken variants into basic forms for wordcloud frequency", () => {
    const entries = buildTranscriptWordcloudEntries(
      "보고 보았고 보다 예쁜 예쁘다 학교에서 학교가",
      [
        { id: "v1", surface: "보다", lemma: "보다", pos: "동사", frequency: 1, reason: "", confidence: 1 },
        { id: "a1", surface: "예쁘다", lemma: "예쁘다", pos: "형용사", frequency: 1, reason: "", confidence: 1 },
        { id: "n1", surface: "학교", lemma: "학교", pos: "명사", frequency: 1, reason: "", confidence: 1 }
      ],
      {},
      { v1: "동사", a1: "형용사", n1: "명사" }
    );

    expect(entries.find((entry) => entry.text === "보다")).toMatchObject({ frequency: 3, pos: "동사" });
    expect(entries.find((entry) => entry.text === "예쁘다")).toMatchObject({ frequency: 2, pos: "형용사" });
    expect(entries.find((entry) => entry.text === "학교")).toMatchObject({ frequency: 2, pos: "명사" });
  });
});
