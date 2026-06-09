import { describe, expect, it } from "vitest";
import { koreanPosSchema, studentIdentitySchema } from "./schemas";

describe("schemas", () => {
  it("accepts Korean nine-parts-of-speech labels", () => {
    expect(koreanPosSchema.parse("명사")).toBe("명사");
    expect(koreanPosSchema.parse("감탄사")).toBe("감탄사");
  });

  it("rejects unsupported part-of-speech labels", () => {
    expect(() => koreanPosSchema.parse("어미")).toThrow();
  });

  it("requires class, student number, and name", () => {
    expect(() =>
      studentIdentitySchema.parse({
        className: "1-1",
        studentNumber: "",
        studentName: "김민수"
      })
    ).toThrow();
  });

  it("derives the Korean class tab from the first two digits of the student number", () => {
    expect(
      studentIdentitySchema.parse({
        studentNumber: "1100",
        studentName: "김민수"
      })
    ).toMatchObject({
      className: "1반",
      studentNumber: "1100",
      studentName: "김민수"
    });

    expect(
      studentIdentitySchema.parse({
        studentNumber: "1200",
        studentName: "이서연"
      })
    ).toMatchObject({ className: "2반" });

    expect(
      studentIdentitySchema.parse({
        studentNumber: "1500",
        studentName: "박지호"
      })
    ).toMatchObject({ className: "5반" });
  });

  it("accepts only four numeric digits for the student number", () => {
    expect(() =>
      studentIdentitySchema.parse({
        studentNumber: "100",
        studentName: "김민수"
      })
    ).toThrow("학번은 숫자 4자리로 입력하세요.");

    expect(() =>
      studentIdentitySchema.parse({
        studentNumber: "10A0",
        studentName: "김민수"
      })
    ).toThrow("학번은 숫자 4자리로 입력하세요.");

    expect(() =>
      studentIdentitySchema.parse({
        studentNumber: "1600",
        studentName: "김민수"
      })
    ).toThrow("학번은 1100부터 1599 사이의 숫자 4자리로 입력하세요.");
  });
});
