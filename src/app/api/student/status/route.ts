import { NextResponse } from "next/server";
import { studentIdentitySchema } from "@/lib/schemas";
import { getStorage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const identity = studentIdentitySchema.parse(await request.json());
    const student = await getStorage().findStudent(identity);
    return NextResponse.json({ exists: Boolean(student) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "학생 상태를 확인하지 못했습니다." },
      { status: 400 }
    );
  }
}
