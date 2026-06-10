import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("global typography", () => {
  test("keeps Korean UI text at natural letter spacing", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).not.toContain("letter-spacing: -0.02em");
  });
});
