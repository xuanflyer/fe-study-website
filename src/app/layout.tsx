import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "前端学习",
  description: "前端面试题刷题平台",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <Providers>
          <NavBar />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
