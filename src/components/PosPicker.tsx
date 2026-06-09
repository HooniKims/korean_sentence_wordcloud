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
    <div className="space-y-4">
      {items.map((item) => (
        <section key={item.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">{item.surface}</h3>
              <p className="text-sm text-slate-600">
                빈도 {item.frequency}회{item.lemma ? ` · 기본형 ${item.lemma}` : ""}
              </p>
            </div>
            <span className="text-xs text-slate-500">{Math.round(item.confidence * 100)}% AI 확신</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
            {KOREAN_POS.map((pos) => {
              const selected = choices[item.id] === pos;
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => choose(item.id, pos)}
                  className={`rounded-md border px-2 py-2 text-sm font-medium transition ${
                    selected ? "bg-slate-950 text-white" : "bg-white text-slate-800 hover:bg-slate-50"
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
