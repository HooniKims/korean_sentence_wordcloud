"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import type { SubmissionRecord } from "@/lib/storage/types";

export default function TeacherPage() {
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<SubmissionRecord[] | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const loginResponse = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const loginData = await loginResponse.json();
      if (!loginResponse.ok) {
        throw new Error(loginData.error ?? "로그인에 실패했습니다.");
      }

      const rosterResponse = await fetch("/api/teacher/roster");
      const rosterData = await rosterResponse.json();
      if (!rosterResponse.ok) {
        throw new Error(rosterData.error ?? "대시보드를 불러오지 못했습니다.");
      }
      setRows(rosterData.rows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-sky-canvas)] text-[var(--color-charcoal-text)]">
      <nav className="sticky top-0 z-20 border-b border-white/25 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 w-full max-w-7xl items-center justify-between px-4 text-sm">
          <Link className="font-medium text-[var(--color-charcoal-text)]" href="/teacher">
            Teacher Dashboard
          </Link>
          <Link className="rounded-[var(--radius-buttons)] border border-[var(--color-charcoal-text)] px-4 py-1.5 font-medium text-[var(--color-charcoal-text)] transition hover:border-[var(--color-action-blue)] hover:text-[var(--color-action-blue)]" href="/">
            학생 화면
          </Link>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10">
        <header className="mx-auto mb-8 max-w-3xl text-center">
          <p className="text-sm font-medium text-white/80">실시간 수업 관리</p>
          <h1 className="mt-3 text-5xl font-medium leading-[1.5] text-white">교사용 대시보드</h1>
          <p className="mx-auto mt-5 max-w-2xl rounded-[var(--radius-cards)] bg-white/90 p-5 text-base leading-[1.5] text-[var(--color-charcoal-text)]">
            학생 제출 현황, 점수, 오답, 이미지 생성 프롬프트를 한 화면에서 확인합니다.
          </p>
        </header>

        {rows ? (
          <TeacherDashboard initialRows={rows} />
        ) : (
          <form onSubmit={login} className="mx-auto grid max-w-sm gap-4 rounded-[var(--radius-cards)] bg-white p-5">
            <label className="grid gap-2 text-sm font-medium">
              교사용 비밀번호
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="border border-black/10 bg-[var(--color-haze-grey)] px-3 py-2.5 outline-none transition focus:border-[var(--color-action-blue)] focus:ring-4 focus:ring-[rgba(43,127,255,0.12)]" />
            </label>
            {error ? <div className="rounded-[var(--radius-buttons)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            <button disabled={isLoading} className="rounded-[var(--radius-buttons)] border border-[var(--color-action-blue)] bg-transparent px-4 py-2.5 font-medium text-[var(--color-action-blue)] transition hover:bg-[rgba(43,127,255,0.08)] disabled:opacity-60">
              {isLoading ? "확인 중..." : "들어가기"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
