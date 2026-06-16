/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TeacherDashboard } from "./TeacherDashboard";
import type { SubmissionRecord } from "@/lib/storage/types";

const rows: SubmissionRecord[] = [
  {
    className: "1반",
    studentNumber: "1101",
    studentName: "김학생",
    locked: false,
    submittedAt: "2026-06-10T00:00:00.000Z",
    analysisItems: [
      { id: "w1", surface: "학교", lemma: "학교", pos: "명사", frequency: 1, reason: "대상 이름", confidence: 1 },
      { id: "w2", surface: "읽다", lemma: "읽다", pos: "동사", frequency: 1, reason: "동작", confidence: 1 }
    ],
    studentChoices: { w1: "명사", w2: "형용사" },
    answerKey: { w1: "명사", w2: "동사" },
    score: 80,
    grading: {
      correctCount: 1,
      totalCount: 2,
      score: 50,
      incorrectItems: [{ id: "w2", surface: "읽다", expected: "동사", actual: "형용사" }]
    },
    incorrectSummary: "읽다: 형용사→동사",
    wordcloudEntries: [],
    imagePrompt: "프롬프트"
  },
  {
    className: "1반",
    studentNumber: "1102",
    studentName: "이학생",
    locked: false,
    analysisItems: [],
    studentChoices: {},
    answerKey: {},
    wordcloudEntries: [],
    imagePrompt: ""
  },
  {
    className: "2반",
    studentNumber: "1201",
    studentName: "박학생",
    locked: true,
    submittedAt: "2026-06-10T00:00:00.000Z",
    analysisItems: [],
    studentChoices: {},
    answerKey: {},
    score: 100,
    incorrectSummary: "",
    wordcloudEntries: [],
    imagePrompt: "프롬프트"
  }
];

describe("TeacherDashboard", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ rows })
      }))
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("shows classroom summary metrics and filters by submission status", async () => {
    render(<TeacherDashboard initialRows={rows} />);

    expect(screen.getByText("전체 3명")).toBeInTheDocument();
    expect(screen.getByText("제출 2명")).toBeInTheDocument();
    expect(screen.getByText("미제출 1명")).toBeInTheDocument();
    expect(screen.getByText("확정 1명")).toBeInTheDocument();
    expect(screen.getByText("평균 90점")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("상태 필터"), { target: { value: "missing" } });

    const table = screen.getByRole("table", { name: "학생 제출 현황" });
    expect(within(table).getByText("1반 1102 이학생")).toBeInTheDocument();
    expect(within(table).queryByText("1반 1101 김학생")).not.toBeInTheDocument();
  });

  test("asks for confirmation before locking the selected class", async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    render(<TeacherDashboard initialRows={rows} />);

    fireEvent.change(screen.getByLabelText("반 필터"), { target: { value: "1반" } });
    fireEvent.click(screen.getByRole("button", { name: "선택 반 전체 확정" }));

    expect(confirm).toHaveBeenCalledWith("1반 학생 2명을 확정할까요? 확정 후 학생 수정이 막힙니다.");
    expect(fetch).not.toHaveBeenCalledWith(
      "/api/teacher/lock-class",
      expect.objectContaining({ method: "POST" })
    );
  });

  test("shows selected student's correct and incorrect choices separately", () => {
    render(<TeacherDashboard initialRows={rows} />);

    const correctSection = screen.getByRole("region", { name: "정답 문항" });
    expect(within(correctSection).getByText("학교")).toBeInTheDocument();
    expect(within(correctSection).getByText("학생 선택: 명사")).toBeInTheDocument();
    expect(within(correctSection).getByText("정답: 명사")).toBeInTheDocument();

    const incorrectSection = screen.getByRole("region", { name: "오답 문항" });
    expect(within(incorrectSection).getByText("읽다")).toBeInTheDocument();
    expect(within(incorrectSection).getByText("학생 선택: 형용사")).toBeInTheDocument();
    expect(within(incorrectSection).getByText("정답: 동사")).toBeInTheDocument();
  });

  test("saves a teacher-edited score without changing the student's saved answers", async () => {
    const updated = { ...rows[0], score: 90, grading: { ...rows[0].grading!, score: 90 } };
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/teacher/score") {
        return {
          ok: true,
          json: async () => ({ detail: updated })
        };
      }
      return {
        ok: true,
        json: async () => ({ rows: [updated, ...rows.slice(1)] })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TeacherDashboard initialRows={rows} />);

    fireEvent.change(screen.getByLabelText("점수 수정"), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: "점수 저장" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/teacher/score",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          identity: { className: "1반", studentNumber: "1101", studentName: "김학생" },
          score: 90
        })
      })
    );
    expect(await screen.findByText("점수 90 · 수정 가능")).toBeInTheDocument();
  });
});
