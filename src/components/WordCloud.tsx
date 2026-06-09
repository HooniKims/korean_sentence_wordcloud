"use client";

import type { WordcloudEntry } from "@/lib/wordcloud";

type Props = {
  entries: WordcloudEntry[];
  compact?: boolean;
};

export function WordCloud({ entries, compact = false }: Props) {
  if (entries.length === 0) {
    return <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-slate-500">아직 워드클라우드가 없습니다.</div>;
  }

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 rounded-md bg-white shadow-sm ${compact ? "p-3" : "p-6"}`}>
      {entries.map((entry) => (
        <span
          key={entry.id}
          className="group relative inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1"
          style={{ borderColor: entry.markerColor }}
          title={`${entry.text} · ${entry.expected ?? entry.pos} · ${entry.frequency}회`}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.markerColor }}
            aria-hidden="true"
          />
          <span
            className="font-semibold leading-none"
            style={{
              color: entry.color,
              fontSize: compact ? Math.max(12, entry.size * 0.45) : entry.size
            }}
          >
            {entry.text}
          </span>
        </span>
      ))}
    </div>
  );
}
