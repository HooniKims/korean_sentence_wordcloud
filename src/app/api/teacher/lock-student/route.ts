import { NextResponse } from "next/server";
import { requireTeacherSession } from "@/lib/auth";
import { studentIdentitySchema } from "@/lib/schemas";
import { getStorage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    await requireTeacherSession();
    const identity = studentIdentitySchema.parse(await request.json());
    await getStorage().lockStudent(identity);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "학생 확정에 실패했습니다." },
      { status: 400 }
    );
  }
}
