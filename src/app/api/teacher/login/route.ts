import { NextResponse } from "next/server";
import { createTeacherSession, isTeacherPassword, setTeacherSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  if (!password || !isTeacherPassword(password)) {
    return NextResponse.json({ error: "교사용 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const token = await createTeacherSession();
  await setTeacherSessionCookie(token);
  return NextResponse.json({ ok: true });
}
