import { NextResponse } from "next/server";
import { requireTeacherSession } from "@/lib/auth";
import { studentIdentitySchema } from "@/lib/schemas";
import { getStorage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    await requireTeacherSession();
    const identity = studentIdentitySchema.parse(await request.json());
    const detail = await getStorage().getStudentDetail(identity);
    if (!detail) {
      return NextResponse.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "학생 정보를 불러오지 못했습니다." },
      { status: 400 }
    );
  }
}
