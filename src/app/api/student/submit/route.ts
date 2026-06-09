import { NextResponse } from "next/server";
import { buildAnswerKey, gradeChoices, summarizeIncorrect } from "@/lib/grading";
import { submitRequestSchema } from "@/lib/schemas";
import { getStorage } from "@/lib/storage";
import { buildWordcloudEntries } from "@/lib/wordcloud";

export async function POST(request: Request) {
  try {
    const input = submitRequestSchema.parse(await request.json());
    const storage = getStorage();
    const student = await storage.findStudent(input);

    if (!student) {
      return NextResponse.json({ error: "반, 학번, 이름이 명단과 일치하지 않습니다." }, { status: 404 });
    }
    if (student.locked) {
      return NextResponse.json({ error: "교사가 확정하여 더 이상 수정할 수 없습니다." }, { status: 423 });
    }

    const answerKey = buildAnswerKey(input.items);
    const grading = gradeChoices(input.items, input.choices, answerKey);
    const wordcloudEntries = buildWordcloudEntries(input.items, input.choices, answerKey, grading);
    const saved = await storage.saveSubmission({
      className: input.className,
      studentNumber: input.studentNumber,
      studentName: input.studentName,
      transcriptText: input.transcriptText,
      analysisItems: input.items,
      studentChoices: input.choices,
      answerKey,
      grading,
      incorrectSummary: summarizeIncorrect(grading),
      wordcloudEntries
    });

    return NextResponse.json({
      wordcloudEntries,
      submittedAt: saved.submittedAt
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "제출 중 오류가 발생했습니다." },
      { status: 400 }
    );
  }
}
