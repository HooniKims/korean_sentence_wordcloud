import { NextResponse } from "next/server";
import { requireTeacherSession } from "@/lib/auth";

import { getStorage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    await requireTeacherSession();
    const { className } = (await request.json()) as { className?: string };
    if (!className) {
      return NextResponse.json({ error: "반을 입력하세요." }, { status: 400 });
    }
    await getStorage().lockClass(className);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "반 전체 확정에 실패했습니다." },
      { status: 400 }
    );
  }
}
