"use client";

import { use } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Markdown } from "@/components/Markdown";
import { AnswerDiff } from "@/components/AnswerDiff";
import { TYPE_LABEL, DIFFICULTY_LABEL, DIFFICULTY_CLASS } from "@/lib/labels";
import type { Feedback } from "@/lib/types";

interface AttemptFull {
  id: string;
  score: number;
  correct: boolean;
  feedback: Feedback | null;
  userAnswer: unknown;
  details: Record<string, unknown>;
  question: {
    id: string;
    type: string;
    title: string;
    body: string;
    difficulty: string;
    source: string;
    score: number;
    explanation: string;
    payload: Record<string, unknown>;
  };
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = use(params);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: async (): Promise<{ attempt: AttemptFull }> => {
      const r = await fetch(`/api/attempts/${attemptId}`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const feedback = useMutation({
    mutationFn: async (f: Feedback) => {
      await fetch(`/api/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ feedback: f }),
      });
    },
    onSuccess: () => refetch(),
  });

  if (isLoading || !data) {
    return <div className="max-w-3xl mx-auto px-6 py-8 text-zinc-500">加载中…</div>;
  }

  const a = data.attempt;
  const q = a.question;
  const ua = a.userAnswer;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link href={`/questions/${id}`} className="text-sm text-blue-600 hover:underline">
        ← 返回题目
      </Link>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {TYPE_LABEL[q.type]}
        </span>
        <span className={`px-2 py-0.5 text-xs rounded ${DIFFICULTY_CLASS[q.difficulty]}`}>
          {DIFFICULTY_LABEL[q.difficulty]}
        </span>
        <span className="text-xs text-zinc-500">来源：{q.source}</span>
      </div>
      <h1 className="text-2xl font-semibold mt-3">{q.title}</h1>

      <div
        className={`mt-4 p-4 rounded-lg border-2 ${
          a.correct
            ? "border-green-500 bg-green-50 dark:bg-green-950/30"
            : "border-red-500 bg-red-50 dark:bg-red-950/30"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">
            {a.correct ? "✓ 回答正确" : "✗ 回答错误"}
          </span>
          <span className="text-lg font-mono">
            {a.score} / {q.score}
          </span>
        </div>
      </div>

      <Section title="你的答案 vs 参考答案">
        <AnswerDiff q={q} userAnswer={ua} details={a.details} />
      </Section>

      <Section title="解析">
        <Markdown>{q.explanation}</Markdown>
      </Section>

      <Section title="反馈">
        <div className="flex gap-2 flex-wrap">
          {(["LEARNED", "SKIP", "STAR"] as const).map((f) => (
            <button
              key={f}
              onClick={() => feedback.mutate(f)}
              className={`px-4 py-2 rounded-lg border text-sm ${
                a.feedback === f
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-blue-400"
              }`}
            >
              {f === "LEARNED" ? "已学会" : f === "SKIP" ? "跳过" : "收藏"}
            </button>
          ))}
        </div>
      </Section>

      <div className="flex gap-3 mt-8">
        <Link
          href="/questions"
          className="px-5 py-2.5 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-zinc-400"
        >
          返回题库
        </Link>
        <Link
          href={`/questions/${id}`}
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          再做一次
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {children}
    </section>
  );
}

