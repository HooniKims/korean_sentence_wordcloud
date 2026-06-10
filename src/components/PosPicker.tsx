"use client";

import { KOREAN_POS, POS_COLORS, type KoreanPos } from "@/lib/pos";
import { POS_PICKER_HINT } from "@/lib/posHints";
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
    <div className="grid gap-4">
      <p className="rounded-[var(--radius-cards)] bg-[#fff7d6] px-4 py-3 text-sm font-medium leading-[1.5] text-[#665200]">
        힌트: {POS_PICKER_HINT}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <section key={item.id} className="rounded-[var(--radius-cards)] bg-white p-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-2xl font-medium text-[var(--color-charcoal-text)]">{item.surface}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-[var(--color-charcoal-text)]/60">빈도 {item.frequency}회</span>
                {item.lemma ? (
                  <span className="inline-flex items-center rounded-[var(--radius-buttons)] bg-[rgba(43,127,255,0.14)] px-3 py-1.5 text-base font-semibold text-[var(--color-action-blue)] shadow-[0_8px_18px_rgba(43,127,255,0.16)] ring-1 ring-[rgba(43,127,255,0.28)]">
                    기본형 {item.lemma}
                  </span>
                ) : null}
              </div>
            </div>
            <span className="rounded-[var(--radius-buttons)] bg-[var(--color-haze-grey)] px-2.5 py-1 text-xs font-medium text-[var(--color-charcoal-text)]/70">{Math.round(item.confidence * 100)}% AI 확신</span>
          </div>
            <div className="grid grid-cols-3 gap-2">
            {KOREAN_POS.map((pos) => {
              const selected = choices[item.id] === pos;
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => choose(item.id, pos)}
                  className={`rounded-[var(--radius-buttons)] border px-3 py-2 text-sm font-medium shadow-sm transition active:scale-[0.96] active:shadow-inner ${
                    selected ? "bg-[rgba(43,127,255,0.08)] text-[var(--color-action-blue)]" : "bg-white text-[var(--color-charcoal-text)] hover:bg-[var(--color-haze-grey)]"
                  }`}
                  style={{ borderColor: selected ? "var(--color-action-blue)" : POS_COLORS[pos] }}
                >
                  {pos}
                </button>
              );
            })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
