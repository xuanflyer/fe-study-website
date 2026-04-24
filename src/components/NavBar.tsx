"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/questions", label: "题库" },
  { href: "/plan", label: "计划" },
  { href: "/stats", label: "统计" },
  { href: "/interview", label: "模拟面试" },
  { href: "/level", label: "能力评估" },
  { href: "/cards", label: "卡片学习" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm dark:bg-zinc-900/90 dark:border-zinc-800">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-8">
        <Link
          href="/"
          className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent shrink-0"
        >
          前端学习
        </Link>
        <nav className="flex gap-1 text-sm overflow-x-auto">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-950/50 dark:text-blue-400"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
