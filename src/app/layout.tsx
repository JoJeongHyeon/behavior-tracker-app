import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "행동 트래커",
  description: "하루 행동을 짧게 기록하고 다시 보는 개인용 트래커",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
