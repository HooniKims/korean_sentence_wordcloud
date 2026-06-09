import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "한국어 품사 워드클라우드",
  description: "수업용 한국어 9품사 워드클라우드 활동"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
