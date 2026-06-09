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
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">교사용 대시보드</h1>
          <p className="mt-2 text-slate-600">학생 제출 현황, 점수, 오답, 워드클라우드를 확인합니다.</p>
        </div>
        <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm" href="/">
          학생 화면
        </Link>
      </header>

      {rows ? (
        <TeacherDashboard initialRows={rows} />
      ) : (
        <form onSubmit={login} className="mx-auto grid max-w-sm gap-4 rounded-md bg-white p-5 shadow-sm">
          <label className="grid gap-1 text-sm font-medium">
            교사용 비밀번호
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2" />
          </label>
          {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          <button disabled={isLoading} className="rounded-md bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-60">
            {isLoading ? "확인 중..." : "들어가기"}
          </button>
        </form>
      )}
    </main>
  );
}
