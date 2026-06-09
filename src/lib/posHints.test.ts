import { describe, expect, it } from "vitest";
import { POS_PICKER_HINT } from "./posHints";

describe("posHints", () => {
  it("gives one simple hint without naming any POS answer", () => {
    expect(POS_PICKER_HINT).toContain("기본형");
    expect(POS_PICKER_HINT).toContain("문장에서 하는 일");
    expect(POS_PICKER_HINT).not.toContain("명사");
    expect(POS_PICKER_HINT).not.toContain("동사");
    expect(POS_PICKER_HINT).not.toContain("용언");
  });
});
