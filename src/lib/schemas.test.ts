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
});
