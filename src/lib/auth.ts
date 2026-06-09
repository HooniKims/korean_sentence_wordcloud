import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { getServerEnv } from "./env";

const COOKIE_NAME = "teacher_session";

function secretKey() {
  return new TextEncoder().encode(getServerEnv().teacherSessionSecret);
}

export async function createTeacherSession() {
  return new SignJWT({ role: "teacher" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function setTeacherSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export async function requireTeacherSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    throw new Error("Teacher session required.");
  }

  const verified = await jwtVerify(token, secretKey());
  if (verified.payload.role !== "teacher") {
    throw new Error("Teacher session required.");
  }
}

export function isTeacherPassword(password: string) {
  return password === getServerEnv().teacherPassword;
}
