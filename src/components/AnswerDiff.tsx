"use client";

import type { TestCaseResult } from "@/lib/types";
import { TestResults } from "@/components/question/CodingQuestion";

export interface AnswerDiffQuestion {
  type: string;
  payload: Record<string, unknown>;
}

export function AnswerDiff({
  q,
  userAnswer,
  details,
}: {
  q: AnswerDiffQuestion;
  userAnswer: unknown;
  details: Record<string, unknown>;
}) {
  const cls =
    "p-3 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 font-mono text-sm whitespace-pre-wrap";

  if (q.type === "SINGLE" || q.type === "MULTI") {
    const payload = q.payload as {
      options: { id: string; label: string }[];
      answer: string[];
    };
    const yours = (userAnswer as string[]) ?? [];
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-zinc-500 mb-1">你的答案</div>
          <div className={cls}>{yours.join(", ") || "（空）"}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">参考答案</div>
          <div className={cls}>{payload.answer.join(", ")}</div>
        </div>
      </div>
    );
  }

  if (q.type === "FILL") {
    const payload = q.payload as { answers: string[] };
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-zinc-500 mb-1">你的答案</div>
          <div className={cls}>{String(userAnswer ?? "")}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">参考答案</div>
          <div className={cls}>{payload.answers.join(" / ")}</div>
        </div>
      </div>
    );
  }

  if (q.type === "PRINT") {
    const payload = q.payload as { expectedOutput: string };
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-zinc-500 mb-1">你的输出</div>
          <div className={cls}>{String(userAnswer ?? "")}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">期望输出</div>
          <div className={cls}>{payload.expectedOutput}</div>
        </div>
      </div>
    );
  }

  if (q.type === "QA") {
    const payload = q.payload as { referenceAnswer: string; keywords: string[] };
    const hits = (details.hits as string[]) ?? [];
    return (
      <div className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-zinc-500 mb-1">你的回答</div>
            <div className={cls}>{String(userAnswer ?? "")}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">参考答案</div>
            <div className={cls}>{payload.referenceAnswer}</div>
          </div>
        </div>
        <div className="text-sm">
          关键词命中：
          {payload.keywords.map((k) => (
            <span
              key={k}
              className={`inline-block px-2 py-0.5 rounded mx-1 text-xs ${
                hits.includes(k)
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
              }`}
            >
              {k}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "CODING") {
    const ua = userAnswer as { code?: string } | null;
    const results = (details.results as TestCaseResult[]) ?? [];
    return (
      <div className="space-y-3">
        <div>
          <div className="text-xs text-zinc-500 mb-1">你的代码</div>
          <pre className={cls}>{ua?.code ?? ""}</pre>
        </div>
        {results.length > 0 && (
          <div>
            <div className="text-xs text-zinc-500 mb-1">测试结果</div>
            <TestResults results={results} />
          </div>
        )}
      </div>
    );
  }

  return <pre className={cls}>{JSON.stringify(userAnswer, null, 2)}</pre>;
}
