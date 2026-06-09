import { NextResponse } from "next/server";
import { requireTeacherSession } from "@/lib/auth";
import { answerKeySchema, studentIdentitySchema } from "@/lib/schemas";
import { getStorage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    await requireTeacherSession();
    const body = await request.json();
    const identity = studentIdentitySchema.parse(body.identity);
    const answerKey = answerKeySchema.parse(body.answerKey);
    const detail = await getStorage().updateAnswerKey(identity, answerKey);
    return NextResponse.json({ detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "정답 수정에 실패했습니다." },
      { status: 400 }
    );
  }
}
