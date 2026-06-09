import { NextResponse } from "next/server";
import { requireTeacherSession } from "@/lib/auth";
import { getStorage } from "@/lib/storage";

export async function GET() {
  try {
    await requireTeacherSession();
    const rows = await getStorage().getDashboardRows();
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "교사용 정보를 불러오지 못했습니다." },
      { status: 401 }
    );
  }
}
