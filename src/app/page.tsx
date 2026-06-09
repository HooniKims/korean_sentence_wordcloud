"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { PosPicker } from "@/components/PosPicker";
import { WordCloud } from "@/components/WordCloud";
import type { AnalysisItem, StudentChoices } from "@/lib/schemas";
import type { WordcloudEntry } from "@/lib/wordcloud";

type Identity = {
  className: string;
  studentNumber: string;
  studentName: string;
};

const emptyIdentity: Identity = {
  className: "",
  studentNumber: "",
  studentName: ""
};

export default function StudentPage() {
  const [identity, setIdentity] = useState<Identity>(emptyIdentity);
  const [transcriptText, setTranscriptText] = useState("");
  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [choices, setChoices] = useState<StudentChoices>({});
  const [wordcloudEntries, setWordcloudEntries] = useState<WordcloudEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const allChosen = useMemo(
    () => items.length > 0 && items.every((item) => choices[item.id]),
    [choices, items]
  );

  async function analyze(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    setWordcloudEntries([]);
    try {
      const response = await fetch("/api/student/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...identity, transcriptText })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "분석에 실패했습니다.");
      }
      setItems(data.items);
      setChoices({});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "분석에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitChoices() {
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/student/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...identity, transcriptText, items, choices })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "제출에 실패했습니다.");
      }
      setWordcloudEntries(data.wordcloudEntries);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "제출에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">한국어 품사 워드클라우드</h1>
          <p className="mt-2 text-slate-600">텍스트를 입력하고, AI가 추린 단어의 품사를 직접 골라보세요.</p>
        </div>
        <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm" href="/teacher">
          교사용
        </Link>
      </header>

      <form onSubmit={analyze} className="grid gap-4 rounded-md bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium">
            반
            <input className="rounded-md border border-slate-300 px-3 py-2" value={identity.className} onChange={(event) => setIdentity({ ...identity, className: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            학번
            <input className="rounded-md border border-slate-300 px-3 py-2" value={identity.studentNumber} onChange={(event) => setIdentity({ ...identity, studentNumber: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            이름
            <input className="rounded-md border border-slate-300 px-3 py-2" value={identity.studentName} onChange={(event) => setIdentity({ ...identity, studentName: event.target.value })} />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          녹음에서 추출한 텍스트
          <textarea className="min-h-44 rounded-md border border-slate-300 px-3 py-2" value={transcriptText} onChange={(event) => setTranscriptText(event.target.value)} />
        </label>
        <button disabled={isLoading} className="w-fit rounded-md bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-60">
          {isLoading ? "분석 중..." : "단어 추출하기"}
        </button>
      </form>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}

      {items.length > 0 && wordcloudEntries.length === 0 ? (
        <section className="grid gap-4">
          <div>
            <h2 className="text-xl font-semibold">품사 선택</h2>
            <p className="text-sm text-slate-600">각 단어가 어떤 품사인지 하나씩 고르세요.</p>
          </div>
          <PosPicker items={items} choices={choices} onChange={setChoices} />
          <button disabled={!allChosen || isLoading} onClick={submitChoices} className="w-fit rounded-md bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-50">
            {isLoading ? "제출 중..." : "제출하고 워드클라우드 보기"}
          </button>
        </section>
      ) : null}

      {wordcloudEntries.length > 0 ? (
        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">내 워드클라우드</h2>
          <WordCloud entries={wordcloudEntries} />
        </section>
      ) : null}
    </main>
  );
}
