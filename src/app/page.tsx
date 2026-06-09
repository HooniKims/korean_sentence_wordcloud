"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PosPicker } from "@/components/PosPicker";
import type { StudentFeedbackItem } from "@/lib/grading";
import type { AnalysisItem, StudentChoices } from "@/lib/schemas";
import {
  STUDENT_PROGRESS_STORAGE_KEY,
  emptyStudentProgress,
  hasStudentIdentity,
  isSubmissionComplete,
  parseStudentProgress,
  shouldResetProgressForSheetStatus,
  stringifyStudentProgress
} from "@/lib/studentProgress";

type Identity = {
  studentNumber: string;
  studentName: string;
};

const emptyIdentity: Identity = {
  studentNumber: "",
  studentName: ""
};

export default function StudentPage() {
  const [identity, setIdentity] = useState<Identity>(emptyIdentity);
  const [transcriptText, setTranscriptText] = useState("");
  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [choices, setChoices] = useState<StudentChoices>({});
  const [imagePrompt, setImagePrompt] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [feedbackItems, setFeedbackItems] = useState<StudentFeedbackItem[]>([]);
  const [score, setScore] = useState<number | undefined>();
  const [correctCount, setCorrectCount] = useState<number | undefined>();
  const [totalCount, setTotalCount] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);

  const allChosen = useMemo(
    () => items.length > 0 && items.every((item) => choices[item.id]),
    [choices, items]
  );

  const submissionComplete = isSubmissionComplete({
    identity,
    transcriptText,
    items,
    choices,
    imagePrompt,
    submittedAt,
    feedbackItems,
    score,
    correctCount,
    totalCount
  });

  useEffect(() => {
    function applyProgress(progress: ReturnType<typeof parseStudentProgress>) {
      setIdentity(progress.identity);
      setTranscriptText(progress.transcriptText);
      setItems(progress.items);
      setChoices(progress.choices);
      setImagePrompt(progress.imagePrompt);
      setSubmittedAt(progress.submittedAt);
      setFeedbackItems(progress.feedbackItems);
      setScore(progress.score);
      setCorrectCount(progress.correctCount);
      setTotalCount(progress.totalCount);
    }

    async function restoreProgress() {
      const progress = parseStudentProgress(window.localStorage.getItem(STUDENT_PROGRESS_STORAGE_KEY));
      if (!hasStudentIdentity(progress)) {
        applyProgress(progress);
        setHasRestoredProgress(true);
        return;
      }

      try {
        const response = await fetch("/api/student/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(progress.identity)
        });
        const data = await response.json();
        const nextProgress = response.ok && shouldResetProgressForSheetStatus(progress, Boolean(data.exists)) ? emptyStudentProgress() : progress;
        applyProgress(nextProgress);
      } catch {
        applyProgress(progress);
      } finally {
        setHasRestoredProgress(true);
      }
    }

    void restoreProgress();
  }, []);

  useEffect(() => {
    if (!hasRestoredProgress) {
      return;
    }

    window.localStorage.setItem(
      STUDENT_PROGRESS_STORAGE_KEY,
      stringifyStudentProgress({
        identity,
        transcriptText,
        items,
        choices,
        imagePrompt,
        submittedAt,
        feedbackItems,
        score,
        correctCount,
        totalCount
      })
    );
  }, [choices, correctCount, feedbackItems, hasRestoredProgress, identity, imagePrompt, items, score, submittedAt, totalCount, transcriptText]);

  async function analyze(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    setImagePrompt("");
    setSubmittedAt("");
    setFeedbackItems([]);
    setScore(undefined);
    setCorrectCount(undefined);
    setTotalCount(undefined);
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
      setSubmittedAt("");
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
      setImagePrompt(data.imagePrompt);
      setSubmittedAt(data.submittedAt ?? new Date().toISOString());
      setFeedbackItems(data.feedbackItems ?? []);
      setScore(data.grading?.score);
      setCorrectCount(data.grading?.correctCount);
      setTotalCount(data.grading?.totalCount);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "제출에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-sky-canvas)] text-[var(--color-charcoal-text)]">
      <nav className="sticky top-0 z-20 border-b border-white/25 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 text-sm">
          <Link className="font-medium text-[var(--color-charcoal-text)]" href="/">
            품사 Wordcloud
          </Link>
          <Link className="rounded-[var(--radius-buttons)] border border-[var(--color-charcoal-text)] px-4 py-1.5 font-medium text-[var(--color-charcoal-text)] transition hover:border-[var(--color-action-blue)] hover:text-[var(--color-action-blue)]" href="/teacher">
            교사용
          </Link>
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-10">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-white/80">한국어 9품사 수업 활동</p>
          <h1 className="mt-3 text-5xl font-medium leading-[1.5] text-[var(--color-cloud-white)] sm:text-6xl">
            말 속 단어를 찾고,
            <br />
            품사를 스스로 살펴봅니다.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl rounded-[var(--radius-cards)] bg-white/90 p-5 text-base leading-[1.5] text-[var(--color-charcoal-text)] backdrop-blur-xl">
            <span className="block">녹음한 말을 글로 옮겨 붙이면, AI가 품사 학습에 알맞은 단어를 추립니다.</span>
            <span className="mt-1 block">학생은 단어마다 품사를 고르고, 마지막에 이미지 생성용 프롬프트를 받습니다.</span>
          </p>
        </header>

        <form onSubmit={analyze} className="grid gap-5 rounded-[var(--radius-cards)] bg-white p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-[var(--color-charcoal-text)]">
              학번
              <input
                className="border border-black/10 bg-[var(--color-haze-grey)] px-3 py-2.5 outline-none transition focus:border-[var(--color-action-blue)] focus:ring-4 focus:ring-[rgba(43,127,255,0.12)]"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                placeholder="1100"
                value={identity.studentNumber}
                onChange={(event) => setIdentity({ ...identity, studentNumber: event.target.value.replace(/\D/g, "").slice(0, 4) })}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--color-charcoal-text)]">
              이름
              <input className="border border-black/10 bg-[var(--color-haze-grey)] px-3 py-2.5 outline-none transition focus:border-[var(--color-action-blue)] focus:ring-4 focus:ring-[rgba(43,127,255,0.12)]" value={identity.studentName} onChange={(event) => setIdentity({ ...identity, studentName: event.target.value })} />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-[var(--color-charcoal-text)]">
            녹음한 말을 글로 옮긴 내용
            <textarea
              className="min-h-48 border border-black/10 bg-[var(--color-haze-grey)] px-3 py-2.5 leading-[1.5] outline-none transition focus:border-[var(--color-action-blue)] focus:ring-4 focus:ring-[rgba(43,127,255,0.12)]"
              placeholder={"예) 오늘 학교에서 친구들과 운동장을 달렸습니다.\n국어 시간에는 문장에서 명사와 동사를 찾아보았습니다."}
              value={transcriptText}
              onChange={(event) => setTranscriptText(event.target.value)}
            />
          </label>
          <button disabled={isLoading} className="w-fit rounded-[var(--radius-buttons)] bg-[var(--color-action-blue)] px-6 py-3 text-base font-semibold text-white shadow-[0_12px_28px_rgba(43,127,255,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1f6ff0] hover:shadow-[0_16px_34px_rgba(43,127,255,0.34)] focus:outline-none focus:ring-4 focus:ring-[rgba(43,127,255,0.24)] active:translate-y-0 disabled:translate-y-0 disabled:opacity-60">
            {isLoading ? "분석 중..." : "단어 추출하기"}
          </button>
        </form>

        {error ? <div className="rounded-[var(--radius-cards)] border border-red-200 bg-white p-4 text-red-700">{error}</div> : null}

        {items.length > 0 && !imagePrompt ? (
          <section className="grid gap-5">
            <div className="text-center">
              <h2 className="text-3xl font-medium text-white">품사 선택</h2>
              <p className="mt-2 text-white/80">각 단어가 어떤 품사인지 하나씩 고르세요.</p>
            </div>
            <PosPicker items={items} choices={choices} onChange={setChoices} />
            <button disabled={!allChosen || isLoading} onClick={submitChoices} className="mx-auto w-fit rounded-[var(--radius-buttons)] bg-white px-7 py-3 text-base font-semibold text-[var(--color-action-blue)] shadow-[0_14px_32px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[var(--color-haze-grey)] hover:shadow-[0_18px_38px_rgba(0,0,0,0.22)] focus:outline-none focus:ring-4 focus:ring-white/35 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50">
              {isLoading ? "제출 중..." : "제출하고 프롬프트 받기"}
            </button>
          </section>
        ) : null}

        {imagePrompt ? (
          <section className="grid gap-5">
            <div className="text-center">
              <h2 className="text-3xl font-medium text-white">{submissionComplete ? "제출 완료" : "이미지 생성 프롬프트"}</h2>
              <p className="mt-2 text-white/80">
                {submissionComplete
                  ? "이미 제출이 끝났습니다. 새로고침해도 이 화면에서 이어서 확인할 수 있습니다."
                  : "아래 내용을 복사해 이미지 생성 도구에 붙여넣으면 됩니다."}
              </p>
            </div>
            <textarea
              readOnly
              className="min-h-80 rounded-[var(--radius-cards)] border border-white/70 bg-white p-5 leading-[1.5] text-[var(--color-charcoal-text)] outline-none"
              value={imagePrompt}
            />
            <section className="rounded-[var(--radius-cards)] bg-white p-5 text-[var(--color-charcoal-text)]">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-medium">오답 확인</h3>
                  <p className="mt-1 text-sm text-[var(--color-charcoal-text)]/70">
                    {typeof score === "number" && typeof correctCount === "number" && typeof totalCount === "number"
                      ? `${totalCount}문제 중 ${correctCount}문제를 맞혔습니다. 점수 ${score}점`
                      : "제출한 답을 확인하세요."}
                  </p>
                </div>
              </div>
              {feedbackItems.length === 0 ? (
                <p className="mt-4 rounded-[var(--radius-buttons)] bg-[rgba(43,127,255,0.08)] px-4 py-3 font-medium text-[var(--color-action-blue)]">
                  틀린 문제가 없습니다.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {feedbackItems.map((item) => (
                    <div key={item.id} className="rounded-[var(--radius-buttons)] border border-red-100 bg-red-50 px-4 py-3">
                      <p className="font-semibold text-[var(--color-charcoal-text)]">
                        {item.surface}
                        {item.lemma ? <span className="ml-2 text-sm font-medium text-[var(--color-charcoal-text)]/60">기본형 {item.lemma}</span> : null}
                      </p>
                      <p className="mt-1 text-sm text-red-700">
                        내가 고른 품사: {item.selected} · 확인할 품사: {item.expected}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        ) : null}
      </div>
    </main>
  );
}
