"use client";

import { useEffect, useMemo, useState } from "react";
import { WordCloud } from "@/components/WordCloud";
import { KOREAN_POS, type KoreanPos } from "@/lib/pos";
import type { StudentIdentity } from "@/lib/schemas";
import type { SubmissionRecord } from "@/lib/storage/types";

type Props = {
  initialRows: SubmissionRecord[];
};

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
  const [error, setError] = useState("");

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

  const classes = useMemo(() => Array.from(new Set(rows.map((row) => row.className))).sort(), [rows]);
  const visibleRows = classFilter ? rows.filter((row) => row.className === classFilter) : rows;

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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/70 bg-white/90 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.07)]">
          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-full border border-black/10 px-4 py-2 outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10">
            <option value="">전체 반</option>
            {classes.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
          <button onClick={lockClass} className="rounded-full bg-[#1d1d1f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black">
            선택 반 전체 확정
          </button>
        </div>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <div className="overflow-hidden rounded-md border border-white/70 bg-white/90 shadow-[0_20px_70px_rgba(0,0,0,0.08)]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#f5f5f7] text-left text-[#6e6e73]">
              <tr>
                <th className="p-3">학생</th>
                <th className="p-3">상태</th>
                <th className="p-3">점수</th>
                <th className="p-3">미리보기</th>
                <th className="p-3">확정</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={`${row.className}-${row.studentNumber}-${row.studentName}`} className="border-t border-black/5 transition hover:bg-[#f5f5f7]/70">
                  <td className="p-3">
                    <button className="text-left font-semibold text-[#1d1d1f]" onClick={() => setSelected(row)}>
                      {row.className} {row.studentNumber} {row.studentName}
                    </button>
                  </td>
                  <td className="p-3">{row.locked ? "확정" : row.submittedAt ? "제출" : "미제출"}</td>
                  <td className="p-3">{row.score ?? "-"}</td>
                  <td className="max-w-60 p-3">
                    <WordCloud entries={row.wordcloudEntries.slice(0, 8)} compact />
                  </td>
                  <td className="p-3">
                    <button disabled={row.locked} onClick={() => lockStudent(row)} className="rounded-full border border-black/10 bg-white px-3 py-1.5 font-medium disabled:opacity-40">
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
            <section className="rounded-md border border-white/70 bg-white/90 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.07)]">
              <h2 className="text-xl font-bold">
                {selected.className} {selected.studentNumber} {selected.studentName}
              </h2>
              <p className="mt-1 text-sm text-[#6e6e73]">
                점수 {selected.score ?? "-"} · {selected.locked ? "확정됨" : "수정 가능"}
              </p>
              <p className="mt-2 text-sm text-red-700">{selected.incorrectSummary}</p>
            </section>
            <WordCloud entries={selected.wordcloudEntries} />
            <section className="grid gap-3 rounded-md border border-white/70 bg-white/90 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.07)]">
              <h3 className="font-semibold">정답 품사 수정</h3>
              {selected.analysisItems.map((item) => (
                <div key={item.id} className="grid gap-2 border-t border-black/5 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.surface}</span>
                    <span className="text-sm text-[#6e6e73]">학생 선택: {selected.studentChoices[item.id] ?? "-"}</span>
                  </div>
                  <select value={selected.answerKey[item.id] ?? item.pos} onChange={(event) => updateAnswer(item.id, event.target.value as KoreanPos)} className="rounded-full border border-black/10 px-4 py-2 outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10">
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
          <section className="rounded-md border border-white/70 bg-white/90 p-6 text-[#6e6e73] shadow-[0_16px_50px_rgba(0,0,0,0.07)]">학생을 선택하세요.</section>
        )}
      </aside>
    </div>
  );
}
