"use client";

import ReactMarkdown from "react-markdown";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-code:text-pink-600 dark:prose-code:text-pink-400">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
