import { NextResponse } from "next/server";
import { analyzeKoreanText } from "@/lib/openaiAnalyzer";
import { analyzeRequestSchema } from "@/lib/schemas";
import { getStorage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const input = analyzeRequestSchema.parse(await request.json());
    const storage = getStorage();
    const student = await storage.findStudent(input);

    if (!student) {
      return NextResponse.json({ error: "반, 학번, 이름이 명단과 일치하지 않습니다." }, { status: 404 });
    }
    if (student.locked) {
      return NextResponse.json({ error: "교사가 확정하여 더 이상 수정할 수 없습니다." }, { status: 423 });
    }

    const items = await analyzeKoreanText(input.transcriptText);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "분석 중 오류가 발생했습니다." },
      { status: 400 }
    );
  }
}
