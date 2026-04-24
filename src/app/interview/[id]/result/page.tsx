"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AnswerDiff } from "@/components/AnswerDiff";
import { Markdown } from "@/components/Markdown";
import { TYPE_LABEL, DIFFICULTY_LABEL, DIFFICULTY_CLASS } from "@/lib/labels";

interface Question {
  id: string;
  type: string;
  title: string;
  difficulty: string;
  score: number;
  payload: Record<string, unknown>;
  explanation: string;
}
interface Attempt {
  id: string;
  questionId: string;
  score: number;
  correct: boolean;
  userAnswer: unknown;
  details: Record<string, unknown>;
}
interface Resp {
  session: {
    id: string;
    mode: string;
    questionIds: string[];
    startedAt: string;
    endedAt: string | null;
    totalScore: number;
    maxScore: number;
    attempts: Attempt[];
  };
  questions: Question[];
}

export default function InterviewResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["interviewResult", sessionId],
    queryFn: async (): Promise<Resp> => {
      const r = await fetch(`/api/interview/${sessionId}`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  if (isLoading || !data) {
    return <div className="max-w-3xl mx-auto px-6 py-8 text-zinc-500">加载中…</div>;
  }

  const s = data.session;
  const attemptsByQ = new Map(s.attempts.map((a) => [a.questionId, a]));
  const answered = s.attempts.length;
  const correct = s.attempts.filter((a) => a.correct).length;
  const totalScore = s.attempts.reduce((acc, a) => acc + a.score, 0);
  const elapsed = s.endedAt
    ? Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)
    : null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link href="/interview" className="text-sm text-blue-600 hover:underline">
        ← 模拟面试
      </Link>

      <div className="mt-4 p-5 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">面试总结</span>
          <span className="text-2xl font-mono">
            {totalScore} / {s.maxScore}
          </span>
        </div>
        <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          已答 {answered} / {s.questionIds.length} · 正确 {correct} ·
          用时{" "}
          {elapsed !== null
            ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
            : "—"}
        </div>
      </div>

      <h2 className="text-lg font-semibold mt-8 mb-3">逐题回顾</h2>
      <ul className="space-y-2">
        {data.questions.map((q, i) => {
          const a = attemptsByQ.get(q.id);
          return <ResultRow key={q.id} index={i + 1} q={q} attempt={a} />;
        })}
      </ul>

      <div className="flex gap-3 mt-8">
        <Link
          href="/interview"
          className="px-5 py-2.5 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-zinc-400"
        >
          再来一场
        </Link>
        <Link
          href="/questions"
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          返回题库
        </Link>
      </div>
    </div>
  );
}

function ResultRow({
  index,
  q,
  attempt,
}: {
  index: number;
  q: Question;
  attempt: Attempt | undefined;
}) {
  const [open, setOpen] = useState(false);
  const correct = attempt?.correct ?? false;
  const score = attempt?.score ?? 0;

  return (
    <li
      className={`rounded-lg border ${
        attempt
          ? correct
            ? "border-green-300 bg-green-50/50 dark:bg-green-950/20"
            : "border-red-300 bg-red-50/50 dark:bg-red-950/20"
          : "bg-white dark:bg-zinc-900 dark:border-zinc-800"
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <span className="text-zinc-500 text-sm w-6">{index}</span>
        <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {TYPE_LABEL[q.type]}
        </span>
        <span className={`px-2 py-0.5 text-xs rounded ${DIFFICULTY_CLASS[q.difficulty]}`}>
          {DIFFICULTY_LABEL[q.difficulty]}
        </span>
        <span className="flex-1 truncate">{q.title}</span>
        <span className="text-sm font-mono">
          {attempt ? `${score} / ${q.score}` : "未答"}
        </span>
        <span className="text-zinc-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && attempt && (
        <div className="px-4 pb-4 border-t dark:border-zinc-800 pt-3 space-y-3">
          <AnswerDiff q={q} userAnswer={attempt.userAnswer} details={attempt.details} />
          {q.explanation && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">解析</div>
              <Markdown>{q.explanation}</Markdown>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
