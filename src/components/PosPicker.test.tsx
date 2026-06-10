/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PosPicker } from "./PosPicker";

describe("PosPicker", () => {
  afterEach(() => cleanup());

  test("makes lemma information prominent and gives POS buttons touch feedback", () => {
    render(
      <PosPicker
        items={[
          {
            id: "w1",
            surface: "달렸다",
            lemma: "달리다",
            pos: "동사",
            frequency: 2,
            reason: "움직임",
            confidence: 0.95
          }
        ]}
        choices={{}}
        onChange={vi.fn()}
      />
    );

    const lemma = screen.getByText("기본형 달리다");
    expect(lemma).toHaveClass("text-base");
    expect(lemma).toHaveClass("shadow-[0_8px_18px_rgba(43,127,255,0.16)]");

    const posButton = screen.getByRole("button", { name: "동사" });
    expect(posButton.className).toContain("active:scale-[0.96]");
    expect(posButton.className).toContain("active:shadow-inner");
  });
});
