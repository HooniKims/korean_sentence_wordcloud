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
  const [copyMessage, setCopyMessage] = useState("");

  const allChosen = useMemo(
    () => items.length > 0 && items.every((item) => choices[item.id]),
    [choices, items]
  );
  const canAnalyze = /^1[1-5]\d{2}$/.test(identity.studentNumber) && identity.studentName.trim().length > 0 && transcriptText.trim().length >= 20;
  const currentStep = imagePrompt ? 3 : items.length > 0 ? 2 : 1;
  const loadingMessage = items.length > 0 ? "AI가 제출 결과와 이미지 프롬프트를 정리하고 있습니다." : "AI가 중학교 수준에서 명확한 단어만 추리고 있습니다.";

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

  async function copyPrompt() {
    if (!imagePrompt) {
      return;
    }

    await navigator.clipboard.writeText(imagePrompt);
    setCopyMessage("복사되었습니다.");
  }

  return (
    <main className="min-h-screen bg-[var(--color-sky-canvas)] text-[var(--color-charcoal-text)]">
      <nav className="sticky top-0 z-20 border-b border-white/25 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 text-sm">
          <Link className="font-medium text-[var(--color-charcoal-text)]" href="/">
            품사 Wordcloud
          </Link>
          <Link className="rounded-[var(--radius-buttons)] border border-[var(--color-charcoal-text)] px-4 py-1.5 font-medium text-[var(--color-charcoal-text)] transition hover:border-[var(--color-action-blue)] hover:text-[var(--color-action-blue)] active:scale-[0.96] active:shadow-inner" href="/teacher">
            교사용
          </Link>
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-8">
        <header className="mx-auto grid max-w-3xl gap-5 text-center">
          <p className="text-sm font-medium text-white/80">한국어 9품사 수업 활동</p>
          <h1 className="text-4xl font-medium leading-[1.2] text-[var(--color-cloud-white)] sm:text-5xl">
            말 속 단어의 품사를 고릅니다.
          </h1>
          <ol className="grid gap-2 rounded-[var(--radius-cards)] bg-white/90 p-3 text-left text-sm backdrop-blur-xl sm:grid-cols-3">
            {["입력", "품사 선택", "제출 완료"].map((label, index) => {
              const step = index + 1;
              const active = step === currentStep;
              return (
                <li
                  key={label}
                  className={`rounded-[var(--radius-buttons)] px-3 py-2 font-semibold ${
                    active ? "bg-[rgba(43,127,255,0.1)] text-[var(--color-action-blue)]" : "text-[var(--color-charcoal-text)]/70"
                  }`}
                >
                  {step} {label}
                </li>
              );
            })}
          </ol>
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
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={!canAnalyze || isLoading} className="w-fit rounded-[var(--radius-buttons)] bg-[var(--color-action-blue)] px-6 py-3 text-base font-semibold text-white shadow-[0_12px_28px_rgba(43,127,255,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1f6ff0] hover:shadow-[0_16px_34px_rgba(43,127,255,0.34)] focus:outline-none focus:ring-4 focus:ring-[rgba(43,127,255,0.24)] active:translate-y-0 active:scale-[0.97] active:shadow-inner disabled:translate-y-0 disabled:scale-100 disabled:opacity-60">
            {isLoading ? "분석 중..." : "단어 추출하기"}
            </button>
            {!canAnalyze ? <p className="text-sm text-[var(--color-charcoal-text)]/65">학번 4자리, 이름, 20자 이상의 글을 입력하세요.</p> : null}
            {isLoading ? (
              <p className="inline-flex items-center gap-2 rounded-[var(--radius-buttons)] bg-[rgba(43,127,255,0.08)] px-3 py-2 text-sm font-medium text-[var(--color-action-blue)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-action-blue)]" aria-hidden="true" />
                {loadingMessage}
              </p>
            ) : null}
          </div>
        </form>

        {error ? <div className="rounded-[var(--radius-cards)] border border-red-200 bg-white p-4 text-red-700">{error}</div> : null}

        {items.length > 0 && !imagePrompt ? (
          <section className="grid gap-5">
            <div className="text-center">
              <h2 className="text-3xl font-medium text-white">품사 선택</h2>
              <p className="mt-2 text-white/80">각 단어가 어떤 품사인지 하나씩 고르세요.</p>
            </div>
            <PosPicker items={items} choices={choices} onChange={setChoices} />
            <button disabled={!allChosen || isLoading} onClick={submitChoices} className="mx-auto w-fit rounded-[var(--radius-buttons)] bg-white px-7 py-3 text-base font-semibold text-[var(--color-action-blue)] shadow-[0_14px_32px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[var(--color-haze-grey)] hover:shadow-[0_18px_38px_rgba(0,0,0,0.22)] focus:outline-none focus:ring-4 focus:ring-white/35 active:translate-y-0 active:scale-[0.97] active:shadow-inner disabled:translate-y-0 disabled:scale-100 disabled:opacity-50">
              {isLoading ? "제출 중..." : "제출하고 프롬프트 받기"}
            </button>
            {isLoading ? (
              <p className="mx-auto inline-flex items-center gap-2 rounded-[var(--radius-buttons)] bg-white/90 px-3 py-2 text-sm font-medium text-[var(--color-action-blue)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-action-blue)]" aria-hidden="true" />
                {loadingMessage}
              </p>
            ) : null}
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
            <div className="grid gap-3 rounded-[var(--radius-cards)] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-medium">이미지 생성 프롬프트</h3>
                <div className="flex items-center gap-3">
                  {copyMessage ? <span className="text-sm font-medium text-[var(--color-action-blue)]">{copyMessage}</span> : null}
                  <button type="button" onClick={copyPrompt} className="rounded-[var(--radius-buttons)] border border-[var(--color-action-blue)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-action-blue)] transition hover:bg-[rgba(43,127,255,0.08)] focus:outline-none focus:ring-4 focus:ring-[rgba(43,127,255,0.16)] active:scale-[0.96] active:shadow-inner">
                    프롬프트 복사하기
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                className="min-h-80 rounded-[var(--radius-inputs)] border border-black/10 bg-[var(--color-haze-grey)] p-4 leading-[1.5] text-[var(--color-charcoal-text)] outline-none"
                value={imagePrompt}
              />
            </div>
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
