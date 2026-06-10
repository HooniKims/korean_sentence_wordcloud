/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { STUDENT_PROGRESS_STORAGE_KEY } from "@/lib/studentProgress";
import StudentPage from "./page";

function mockFetchWithEmptyProgress() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ exists: false })
    }))
  );
}

describe("StudentPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockFetchWithEmptyProgress();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("keeps analysis disabled until required fields are valid and shows the classroom steps", async () => {
    render(<StudentPage />);

    expect(screen.getByText("1 입력")).toBeInTheDocument();
    expect(screen.getByText("2 품사 선택")).toBeInTheDocument();
    expect(screen.getByText("3 제출 완료")).toBeInTheDocument();

    const analyzeButton = screen.getByRole("button", { name: "단어 추출하기" });
    expect(analyzeButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("학번"), { target: { value: "1101" } });
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "김학생" } });
    fireEvent.change(screen.getByLabelText("녹음한 말을 글로 옮긴 내용"), { target: { value: "짧은 글" } });
    expect(analyzeButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("녹음한 말을 글로 옮긴 내용"), {
      target: { value: "오늘 학교에서 친구들과 운동장을 달리고 국어 시간에는 품사를 공부했습니다." }
    });
    expect(analyzeButton).toBeEnabled();
  });

  test("lets students copy a restored image prompt", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ exists: true })
      }))
    );
    window.localStorage.setItem(
      STUDENT_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        identity: { studentNumber: "1101", studentName: "김학생" },
        transcriptText: "오늘 학교에서 친구들과 운동장을 달리고 국어 시간에는 품사를 공부했습니다.",
        items: [
          {
            id: "word-1",
            surface: "학교",
            lemma: "",
            pos: "명사",
            frequency: 1,
            reason: "",
            confidence: 0.9
          }
        ],
        choices: { "word-1": "명사" },
        imagePrompt: "밝은 교실에서 품사 단어가 떠오르는 장면",
        submittedAt: "2026-06-10T00:00:00.000Z",
        feedbackItems: [],
        score: 100,
        correctCount: 1,
        totalCount: 1
      })
    );

    render(<StudentPage />);

    const copyButton = await screen.findByRole("button", { name: "프롬프트 복사하기" });
    fireEvent.click(copyButton);

    expect(writeText).toHaveBeenCalledWith("밝은 교실에서 품사 단어가 떠오르는 장면");
    await waitFor(() => expect(screen.getByText("복사되었습니다.")).toBeInTheDocument());
  });

  test("shows that AI analysis is in progress after submitting transcript text", async () => {
    let resolveAnalyze: (value: unknown) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input) => {
        if (String(input).includes("/api/student/analyze")) {
          return new Promise((resolve) => {
            resolveAnalyze = resolve;
          });
        }

        return {
          ok: true,
          json: async () => ({ exists: false })
        };
      })
    );

    render(<StudentPage />);

    fireEvent.change(screen.getByLabelText("학번"), { target: { value: "1101" } });
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "김학생" } });
    fireEvent.change(screen.getByLabelText("녹음한 말을 글로 옮긴 내용"), {
      target: { value: "오늘 학교에서 친구들과 운동장을 달리고 국어 시간에는 품사를 공부했습니다." }
    });
    fireEvent.click(screen.getByRole("button", { name: "단어 추출하기" }));

    expect(await screen.findByText("AI가 중학교 수준에서 명확한 단어만 추리고 있습니다.")).toBeInTheDocument();

    resolveAnalyze({
      ok: true,
      json: async () => ({ items: [] })
    });
  });
});
