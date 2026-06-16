"use client";

import { useEffect, useMemo, useState } from "react";
import { KOREAN_POS, type KoreanPos } from "@/lib/pos";
import type { StudentIdentity } from "@/lib/schemas";
import type { SubmissionRecord } from "@/lib/storage/types";
import { buildTeacherPrintRows, getTeacherPrintTitle } from "@/lib/teacherPrint";

type Props = {
  initialRows: SubmissionRecord[];
};

type StatusFilter = "all" | "submitted" | "missing" | "locked" | "needs-review";

function identity(row: SubmissionRecord): StudentIdentity {
  return {
    className: row.className,
    studentNumber: row.studentNumber,
    studentName: row.studentName
  };
}

export function TeacherDashboard({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [selected, setSelected] = useState<SubmissionRecord | null>(initialRows[0] ?? null);
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [error, setError] = useState("");
  const [scoreDraft, setScoreDraft] = useState(String(initialRows[0]?.score ?? ""));

  async function refresh() {
    const response = await fetch("/api/teacher/roster");
    const data = await response.json();
    if (response.ok) {
      setRows(data.rows);
      setError("");
    } else {
      setError(data.error ?? "대시보드를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setScoreDraft(String(selected?.score ?? ""));
  }, [selected]);

  const classes = useMemo(() => Array.from(new Set(rows.map((row) => row.className))).sort(), [rows]);
  const classRows = classFilter ? rows.filter((row) => row.className === classFilter) : rows;
  const submittedRows = classRows.filter((row) => Boolean(row.submittedAt));
  const averageScore = submittedRows.length > 0 ? Math.round(submittedRows.reduce((sum, row) => sum + (row.score ?? 0), 0) / submittedRows.length) : undefined;
  const summaryItems = [
    { label: "전체", value: `${classRows.length}명` },
    { label: "제출", value: `${submittedRows.length}명` },
    { label: "미제출", value: `${classRows.filter((row) => !row.submittedAt).length}명` },
    { label: "확정", value: `${classRows.filter((row) => row.locked).length}명` },
    { label: "평균", value: averageScore === undefined ? "-" : `${averageScore}점` }
  ];
  const visibleRows = classRows.filter((row) => {
    if (statusFilter === "submitted") {
      return Boolean(row.submittedAt) && !row.locked;
    }
    if (statusFilter === "missing") {
      return !row.submittedAt;
    }
    if (statusFilter === "locked") {
      return row.locked;
    }
    if (statusFilter === "needs-review") {
      return Boolean(row.incorrectSummary);
    }
    return true;
  }).sort(
    (left, right) => left.className.localeCompare(right.className, "ko") || left.studentNumber.localeCompare(right.studentNumber, "ko")
  );
  const printRows = buildTeacherPrintRows(visibleRows);
  const printTitle = getTeacherPrintTitle(classFilter);

  function printDashboard() {
    window.print();
  }

  async function lockStudent(row: SubmissionRecord) {
    await fetch("/api/teacher/lock-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(identity(row))
    });
    await refresh();
  }

  async function lockClass() {
    if (!classFilter) {
      setError("반 전체 확정은 반을 먼저 선택해야 합니다.");
      return;
    }
    if (!window.confirm(`${classFilter} 학생 ${classRows.length}명을 확정할까요? 확정 후 학생 수정이 막힙니다.`)) {
      return;
    }
    await fetch("/api/teacher/lock-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ className: classFilter })
    });
    await refresh();
  }

  async function updateAnswer(itemId: string, pos: KoreanPos) {
    if (!selected) {
      return;
    }
    const answerKey = { ...selected.answerKey, [itemId]: pos };
    const response = await fetch("/api/teacher/answer-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: identity(selected), answerKey })
    });
    const data = await response.json();
    if (response.ok) {
      setSelected(data.detail);
      await refresh();
    } else {
      setError(data.error ?? "정답 수정에 실패했습니다.");
    }
  }

  async function updateScore() {
    if (!selected) {
      return;
    }
    const score = Number(scoreDraft);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      setError("점수는 0점부터 100점까지 입력하세요.");
      return;
    }

    const response = await fetch("/api/teacher/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: identity(selected), score })
    });
    const data = await response.json();
    if (response.ok) {
      setSelected(data.detail);
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.className === selected.className &&
          row.studentNumber === selected.studentNumber &&
          row.studentName === selected.studentName
            ? data.detail
            : row
        )
      );
      setError("");
      await refresh();
    } else {
      setError(data.error ?? "점수 수정에 실패했습니다.");
    }
  }

  const selectedAnswerRows = selected
    ? selected.analysisItems.map((item) => {
        const expected = selected.answerKey[item.id] ?? item.pos;
        const actual = selected.studentChoices[item.id];
        return {
          item,
          expected,
          actual,
          isCorrect: actual === expected
        };
      })
    : [];
  const correctAnswerRows = selectedAnswerRows.filter((row) => row.isCorrect);
  const incorrectAnswerRows = selectedAnswerRows.filter((row) => !row.isCorrect);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
      <section className="grid gap-4">
        <div className="grid gap-3 rounded-[var(--radius-cards)] bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-[var(--radius-buttons)] bg-[var(--color-haze-grey)] px-4 py-3">
                <p className="text-xs font-medium text-[var(--color-charcoal-text)]/60">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--color-charcoal-text)]">
                  {item.label} {item.value}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <label className="grid gap-1 text-xs font-medium text-[var(--color-charcoal-text)]/70">
                반 필터
                <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-[var(--radius-buttons)] border border-black/10 bg-[var(--color-haze-grey)] px-4 py-2 text-sm outline-none focus:border-[var(--color-action-blue)] focus:ring-4 focus:ring-[rgba(43,127,255,0.12)]">
                  <option value="">전체 반</option>
                  {classes.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-[var(--color-charcoal-text)]/70">
                상태 필터
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="rounded-[var(--radius-buttons)] border border-black/10 bg-[var(--color-haze-grey)] px-4 py-2 text-sm outline-none focus:border-[var(--color-action-blue)] focus:ring-4 focus:ring-[rgba(43,127,255,0.12)]">
                  <option value="all">전체 상태</option>
                  <option value="submitted">제출</option>
                  <option value="missing">미제출</option>
                  <option value="locked">확정</option>
                  <option value="needs-review">오답 있음</option>
                </select>
              </label>
            </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={printDashboard} className="rounded-[var(--radius-buttons)] border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[var(--color-charcoal-text)] transition hover:border-[var(--color-action-blue)] hover:text-[var(--color-action-blue)] active:scale-[0.96] active:shadow-inner">
              출력
            </button>
            <button onClick={lockClass} className="rounded-[var(--radius-buttons)] border border-[var(--color-action-blue)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-action-blue)] transition hover:bg-[rgba(43,127,255,0.08)] active:scale-[0.96] active:shadow-inner">
              선택 반 전체 확정
            </button>
          </div>
          </div>
        </div>

        {error ? <div className="rounded-[var(--radius-cards)] border border-red-200 bg-white p-3 text-sm text-red-700">{error}</div> : null}

        <div className="overflow-hidden rounded-[var(--radius-cards)] bg-white">
          <table aria-label="학생 제출 현황" className="w-full border-collapse text-sm">
            <thead className="bg-[var(--color-haze-grey)] text-left text-[var(--color-charcoal-text)]">
              <tr>
                <th className="p-3">학생</th>
                <th className="p-3">상태</th>
                <th className="p-3">점수</th>
                <th className="p-3">프롬프트</th>
                <th className="p-3">확정</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={`${row.className}-${row.studentNumber}-${row.studentName}`} className="border-t border-black/5 transition hover:bg-[var(--color-haze-grey)]">
                  <td className="p-3">
                    <button className="text-left font-medium text-[var(--color-charcoal-text)] hover:text-[var(--color-action-blue)]" onClick={() => setSelected(row)}>
                      {row.className} {row.studentNumber} {row.studentName}
                    </button>
                  </td>
                  <td className="p-3">{row.locked ? "확정" : row.submittedAt ? "제출" : "미제출"}</td>
                  <td className="p-3">{row.score ?? "-"}</td>
                  <td className="max-w-60 p-3">
                    {row.imagePrompt ? "생성됨" : "-"}
                  </td>
                  <td className="p-3">
                    <button disabled={row.locked} onClick={() => lockStudent(row)} className="rounded-[var(--radius-buttons)] border border-black/10 bg-white px-3 py-1.5 font-medium transition hover:border-[var(--color-action-blue)] hover:text-[var(--color-action-blue)] active:scale-[0.96] active:shadow-inner disabled:scale-100 disabled:opacity-40">
                      확정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="grid content-start gap-4">
        {selected ? (
          <>
            <section className="rounded-[var(--radius-cards)] bg-white p-5">
              <h2 className="text-xl font-medium">
                {selected.className} {selected.studentNumber} {selected.studentName}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-charcoal-text)]/70">
                점수 {selected.score ?? "-"} · {selected.locked ? "확정됨" : "수정 가능"}
              </p>
              <p className="mt-2 text-sm text-red-700">{selected.incorrectSummary}</p>
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <label className="grid gap-1 text-xs font-medium text-[var(--color-charcoal-text)]/70">
                  점수 수정
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={scoreDraft}
                    onChange={(event) => setScoreDraft(event.target.value)}
                    className="w-28 rounded-[var(--radius-buttons)] border border-black/10 bg-[var(--color-haze-grey)] px-3 py-2 text-sm outline-none focus:border-[var(--color-action-blue)] focus:ring-4 focus:ring-[rgba(43,127,255,0.12)]"
                  />
                </label>
                <button onClick={updateScore} className="rounded-[var(--radius-buttons)] border border-[var(--color-action-blue)] bg-[var(--color-action-blue)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-95 active:scale-[0.96] active:shadow-inner">
                  점수 저장
                </button>
              </div>
            </section>
            <section aria-label="정답 문항" className="grid gap-3 rounded-[var(--radius-cards)] bg-white p-5">
              <h3 className="font-medium">정답 문항</h3>
              {correctAnswerRows.length > 0 ? (
                correctAnswerRows.map(({ item, actual, expected }) => (
                  <div key={item.id} className="grid gap-1 border-t border-black/5 pt-3 text-sm">
                    <span className="font-medium">{item.surface}</span>
                    <span className="text-[var(--color-charcoal-text)]/70">학생 선택: {actual ?? "미선택"}</span>
                    <span className="text-[var(--color-charcoal-text)]/70">정답: {expected}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--color-charcoal-text)]/60">정답 문항이 없습니다.</p>
              )}
            </section>
            <section aria-label="오답 문항" className="grid gap-3 rounded-[var(--radius-cards)] bg-white p-5">
              <h3 className="font-medium">오답 문항</h3>
              {incorrectAnswerRows.length > 0 ? (
                incorrectAnswerRows.map(({ item, actual, expected }) => (
                  <div key={item.id} className="grid gap-1 border-t border-black/5 pt-3 text-sm">
                    <span className="font-medium">{item.surface}</span>
                    <span className="text-red-700">학생 선택: {actual ?? "미선택"}</span>
                    <span className="text-[var(--color-charcoal-text)]/70">정답: {expected}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--color-charcoal-text)]/60">오답 문항이 없습니다.</p>
              )}
            </section>
            <section className="grid gap-3 rounded-[var(--radius-cards)] bg-white p-5">
              <h3 className="font-medium">이미지 생성 프롬프트</h3>
              <textarea
                readOnly
                className="min-h-72 rounded-[var(--radius-inputs)] border border-black/10 bg-[var(--color-haze-grey)] px-3 py-2.5 text-sm leading-[1.5] outline-none"
                value={selected.imagePrompt || "아직 생성된 프롬프트가 없습니다."}
              />
            </section>
            <section className="grid gap-3 rounded-[var(--radius-cards)] bg-white p-5">
              <h3 className="font-medium">정답 품사 수정</h3>
              {selected.analysisItems.map((item) => (
                <div key={item.id} className="grid gap-2 border-t border-black/5 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.surface}</span>
                    <span className="text-sm text-[var(--color-charcoal-text)]/70">학생 선택: {selected.studentChoices[item.id] ?? "-"}</span>
                  </div>
                  <select value={selected.answerKey[item.id] ?? item.pos} onChange={(event) => updateAnswer(item.id, event.target.value as KoreanPos)} className="rounded-[var(--radius-buttons)] border border-black/10 bg-[var(--color-haze-grey)] px-4 py-2 outline-none focus:border-[var(--color-action-blue)] focus:ring-4 focus:ring-[rgba(43,127,255,0.12)]">
                    {KOREAN_POS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </section>
          </>
        ) : (
          <section className="rounded-[var(--radius-cards)] bg-white p-6 text-[var(--color-charcoal-text)]/70">학생을 선택하세요.</section>
        )}
      </aside>
      <section className="teacher-print-sheet">
        <h1>{printTitle}</h1>
        <p>{new Date().toLocaleDateString("ko-KR")} · {printRows.length}명</p>
        <table>
          <thead>
            <tr>
              <th>학생</th>
              <th>상태</th>
              <th>점수</th>
              <th>오답 요약</th>
            </tr>
          </thead>
          <tbody>
            {printRows.map((row) => (
              <tr key={row.student}>
                <td>{row.student}</td>
                <td>{row.status}</td>
                <td>{row.score}</td>
                <td>{row.incorrectSummary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
