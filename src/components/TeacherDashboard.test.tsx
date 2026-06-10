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
    analysisItems: [],
    studentChoices: {},
    answerKey: {},
    score: 80,
    incorrectSummary: "학교: 명사",
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
});
