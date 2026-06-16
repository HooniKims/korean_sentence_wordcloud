import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTeacherSession } from "@/lib/auth";
import { studentIdentitySchema } from "@/lib/schemas";
import { getStorage } from "@/lib/storage";

const scoreUpdateSchema = z.object({
  identity: studentIdentitySchema,
  score: z.number().min(0).max(100)
});

export async function POST(request: Request) {
  try {
    await requireTeacherSession();
    const input = scoreUpdateSchema.parse(await request.json());
    const detail = await getStorage().updateScore(input.identity, input.score);
    return NextResponse.json({ detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "점수 수정에 실패했습니다." },
      { status: 400 }
    );
  }
}
