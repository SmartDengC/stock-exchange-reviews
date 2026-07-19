import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "市场日记 · 研究终端",
  description: "个人市场复盘与周度研究终端",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
