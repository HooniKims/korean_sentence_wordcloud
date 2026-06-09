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
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <nav className="sticky top-0 z-20 border-b border-black/5 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 text-sm">
          <Link className="font-semibold tracking-tight" href="/">
            품사 Wordcloud
          </Link>
          <Link className="rounded-full bg-[#0071e3] px-4 py-1.5 font-medium text-white transition hover:bg-[#0077ed]" href="/teacher">
            교사용
          </Link>
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-10">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-[#6e6e73]">한국어 9품사 수업 활동</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-[#1d1d1f] sm:text-6xl">
            말에서 단어를 찾고,
            <br />
            품사를 눈으로 봅니다.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#6e6e73]">
            녹음에서 추출한 텍스트를 넣으면 AI가 학습용 단어를 추리고, 학생은 각 단어의 품사를 고른 뒤 개인 워드클라우드를 확인합니다.
          </p>
        </header>

        <form onSubmit={analyze} className="grid gap-5 rounded-md border border-white/70 bg-white/90 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.08)]">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold text-[#1d1d1f]">
              반
              <input className="rounded-md border border-black/10 px-4 py-3 outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10" value={identity.className} onChange={(event) => setIdentity({ ...identity, className: event.target.value })} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#1d1d1f]">
              학번
              <input className="rounded-md border border-black/10 px-4 py-3 outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10" value={identity.studentNumber} onChange={(event) => setIdentity({ ...identity, studentNumber: event.target.value })} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#1d1d1f]">
              이름
              <input className="rounded-md border border-black/10 px-4 py-3 outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10" value={identity.studentName} onChange={(event) => setIdentity({ ...identity, studentName: event.target.value })} />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-[#1d1d1f]">
            녹음에서 추출한 텍스트
            <textarea className="min-h-48 rounded-md border border-black/10 px-4 py-3 leading-7 outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10" value={transcriptText} onChange={(event) => setTranscriptText(event.target.value)} />
          </label>
          <button disabled={isLoading} className="w-fit rounded-full bg-[#0071e3] px-6 py-2.5 font-semibold text-white transition hover:bg-[#0077ed] disabled:opacity-60">
            {isLoading ? "분석 중..." : "단어 추출하기"}
          </button>
        </form>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}

        {items.length > 0 && wordcloudEntries.length === 0 ? (
          <section className="grid gap-5">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight">품사 선택</h2>
              <p className="mt-2 text-[#6e6e73]">각 단어가 어떤 품사인지 하나씩 고르세요.</p>
            </div>
            <PosPicker items={items} choices={choices} onChange={setChoices} />
            <button disabled={!allChosen || isLoading} onClick={submitChoices} className="mx-auto w-fit rounded-full bg-[#0071e3] px-6 py-2.5 font-semibold text-white transition hover:bg-[#0077ed] disabled:opacity-50">
              {isLoading ? "제출 중..." : "제출하고 워드클라우드 보기"}
            </button>
          </section>
        ) : null}

        {wordcloudEntries.length > 0 ? (
          <section className="grid gap-5">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight">내 워드클라우드</h2>
            </div>
            <WordCloud entries={wordcloudEntries} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
