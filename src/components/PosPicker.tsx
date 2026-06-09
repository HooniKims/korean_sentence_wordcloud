"use client";

import { KOREAN_POS, POS_COLORS, type KoreanPos } from "@/lib/pos";
import type { AnalysisItem, StudentChoices } from "@/lib/schemas";

type Props = {
  items: AnalysisItem[];
  choices: StudentChoices;
  onChange: (choices: StudentChoices) => void;
};

export function PosPicker({ items, choices, onChange }: Props) {
  function choose(itemId: string, pos: KoreanPos) {
    onChange({ ...choices, [itemId]: pos });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <section key={item.id} className="rounded-md border border-white/70 bg-white/90 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.07)]">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">{item.surface}</h3>
              <p className="text-sm text-[#6e6e73]">
                빈도 {item.frequency}회{item.lemma ? ` · 기본형 ${item.lemma}` : ""}
              </p>
            </div>
            <span className="rounded-full bg-[#f5f5f7] px-2.5 py-1 text-xs font-medium text-[#6e6e73]">{Math.round(item.confidence * 100)}% AI 확신</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {KOREAN_POS.map((pos) => {
              const selected = choices[item.id] === pos;
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => choose(item.id, pos)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    selected ? "bg-[#1d1d1f] text-white shadow-sm" : "bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]"
                  }`}
                  style={{ borderColor: POS_COLORS[pos] }}
                >
                  {pos}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
