export const KOREAN_POS = [
  "명사",
  "대명사",
  "수사",
  "동사",
  "형용사",
  "관형사",
  "부사",
  "조사",
  "감탄사"
] as const;

export type KoreanPos = (typeof KOREAN_POS)[number];

export const POS_COLORS: Record<KoreanPos, string> = {
  명사: "#2563eb",
  대명사: "#7c3aed",
  수사: "#0891b2",
  동사: "#dc2626",
  형용사: "#ea580c",
  관형사: "#16a34a",
  부사: "#9333ea",
  조사: "#64748b",
  감탄사: "#db2777"
};

export function isKoreanPos(value: string): value is KoreanPos {
  return (KOREAN_POS as readonly string[]).includes(value);
}
