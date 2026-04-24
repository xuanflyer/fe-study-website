"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Markdown } from "@/components/Markdown";
import { ChoiceQuestion } from "@/components/question/ChoiceQuestion";
import { FillQuestion } from "@/components/question/FillQuestion";
import { QAQuestion } from "@/components/question/QAQuestion";
import { CodingQuestion } from "@/components/question/CodingQuestion";
import { PrintQuestion } from "@/components/question/PrintQuestion";
import { TYPE_LABEL, DIFFICULTY_LABEL, DIFFICULTY_CLASS } from "@/lib/labels";
import type { TestCaseResult } from "@/lib/types";

interface CardQuestion {
  id: string;
  type: string;
  title: string;
  body: string;
  difficulty: string;
  tags: string[];
  source: string;
  score: number;
  payload: Record<string, unknown>;
  explanation: string;
  isFavorite: boolean;
}

type CardStatus = "idle" | "graded" | "skipped" | "mastered";

interface CardState {
  status: CardStatus;
  choice: string[];
  text: string;
  code: string | null;
  codingResults: TestCaseResult[];
  printOutput: string;
  correct?: boolean;
  score?: number;
  favorite: boolean;
}

function makeInitial(q: CardQuestion): CardState {
  return {
    status: "idle",
    choice: [],
    text: "",
    code: null,
    codingResults: [],
    printOutput: "",
    favorite: q.isFavorite,
  };
}

export default function CardsPage() {
  const [batchKey, setBatchKey] = useState(0);
  const [idx, setIdx] = useState(0);
  const [states, setStates] = useState<CardState[]>([]);
  const [startedAt] = useState(() => Date.now());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["cards", batchKey],
    queryFn: async (): Promise<{ items: CardQuestion[] }> => {
      const r = await fetch("/api/cards");
      if (!r.ok) throw new Error("failed");
      const j = (await r.json()) as { items: CardQuestion[] };
      setStates(j.items.map(makeInitial));
      setIdx(0);
      return j;
    },
  });

  const items = data?.items ?? [];
  const total = items.length;
  const current = items[idx];
  const cur = states[idx];

  const submit = useMutation({
    mutationFn: async (userAnswer: unknown) => {
      const r = await fetch("/api/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: current!.id, userAnswer }),
      });
      if (!r.ok) throw new Error("failed");
      return r.json() as Promise<{ attempt: { correct: boolean; score: number; details: Record<string, unknown> } }>;
    },
    onSuccess: (d) => {
      setStates((prev) => {
        const next = prev.slice();
        next[idx] = { ...next[idx], status: "graded", correct: d.attempt.correct, score: d.attempt.score };
        return next;
      });
    },
  });

  const master = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/questions/${current!.id}/master`, { method: "POST" });
      if (!r.ok) throw new Error("failed");
    },
    onSuccess: () => {
      setStates((prev) => {
        const next = prev.slice();
        next[idx] = { ...next[idx], status: "mastered" };
        return next;
      });
      goNext();
    },
  });

  const favorite = useMutation({
    mutationFn: async (nextFav: boolean) => {
      const r = await fetch(`/api/questions/${current!.id}/favorite`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isFavorite: nextFav }),
      });
      if (!r.ok) throw new Error("failed");
      return nextFav;
    },
    onSuccess: (nextFav) => {
      setStates((prev) => {
        const next = prev.slice();
        next[idx] = { ...next[idx], favorite: nextFav };
        return next;
      });
    },
  });

  const summary = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let mastered = 0;
    for (const s of states) {
      if (s.status === "graded") {
        if (s.correct) correct++;
        else wrong++;
      }
      else if (s.status === "skipped") skipped++;
      else if (s.status === "mastered") mastered++;
    }
    return { correct, wrong, skipped, mastered };
  }, [states]);

  const allResolved = total > 0 && states.every((s) => s.status !== "idle");

  function goPrev() {
    if (idx > 0) setIdx(idx - 1);
  }
  function goNext() {
    if (idx < total - 1) setIdx(idx + 1);
  }
  function onSkip() {
    setStates((prev) => {
      const next = prev.slice();
      if (next[idx].status === "idle") next[idx] = { ...next[idx], status: "skipped" };
      return next;
    });
    goNext();
  }

  function onSubmit() {
    if (!current || !cur) return;
    const payload = current.payload;
    const starter = (payload as { starterCode?: string }).starterCode ?? "";
    const effectiveCode = cur.code ?? starter;

    let answer: unknown;
    switch (current.type) {
      case "SINGLE":
      case "MULTI":
        answer = cur.choice;
        break;
      case "FILL":
      case "QA":
        answer = cur.text;
        break;
      case "CODING":
        if (cur.codingResults.length === 0) {
          alert("请先「运行测试」再提交");
          return;
        }
        answer = { code: effectiveCode, results: cur.codingResults };
        break;
      case "PRINT":
        answer = cur.printOutput;
        break;
      default:
        return;
    }
    submit.mutate(answer);
  }

  function patchCur(patch: Partial<CardState>) {
    setStates((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function restart() {
    setBatchKey((k) => k + 1);
    refetch();
  }

  if (isLoading) {
    return <div className="max-w-3xl mx-auto px-6 py-10 text-zinc-500">加载中…</div>;
  }
  if (isError) {
    return <div className="max-w-3xl mx-auto px-6 py-10 text-red-600">加载失败</div>;
  }
  if (total === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h1 className="text-xl font-semibold mb-2">暂无可学习的卡片</h1>
        <p className="text-zinc-500 mb-6">题库还没题目，或所有题目都已「已学会」。</p>
        <Link href="/questions" className="text-blue-600 hover:underline">去题库看看</Link>
      </div>
    );
  }

  if (allResolved) {
    const durSec = Math.round((Date.now() - startedAt) / 1000);
    const answered = summary.correct + summary.wrong;
    const acc = answered === 0 ? 0 : Math.round((summary.correct / answered) * 100);
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold mb-6">本批总结</h1>
        <div className="grid grid-cols-4 gap-3 mb-6">
          <SumCard label="答对" value={summary.correct} tone="green" />
          <SumCard label="答错" value={summary.wrong} tone="red" />
          <SumCard label="跳过" value={summary.skipped} tone="zinc" />
          <SumCard label="已学会" value={summary.mastered} tone="blue" />
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-8">
          正确率 {acc}% · 用时 {Math.floor(durSec / 60)} 分 {durSec % 60} 秒
        </div>
        <div className="flex gap-3">
          <button
            onClick={restart}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            再来一批
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-zinc-400"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const q = current!;
  const payload = q.payload;
  const starter = (payload as { starterCode?: string }).starterCode ?? "";
  const effectiveCode = cur.code ?? starter;
  const graded = cur.status === "graded";
  const skipped = cur.status === "skipped";

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-zinc-500">{idx + 1} / {total}</div>
        <button
          onClick={() => favorite.mutate(!cur.favorite)}
          className="text-xl"
          aria-label={cur.favorite ? "取消收藏" : "收藏"}
          title={cur.favorite ? "取消收藏" : "收藏"}
        >
          {cur.favorite ? "★" : "☆"}
        </button>
      </div>
      <div className="h-1 rounded bg-zinc-200 dark:bg-zinc-800 mb-6">
        <div
          className="h-1 rounded bg-blue-600 transition-all"
          style={{ width: `${((idx + 1) / total) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-6">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {TYPE_LABEL[q.type]}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded ${DIFFICULTY_CLASS[q.difficulty]}`}>
            {DIFFICULTY_LABEL[q.difficulty]}
          </span>
          <span className="text-xs text-zinc-500">来源：{q.source}</span>
        </div>

        <h1 className="text-xl font-semibold mb-3">{q.title}</h1>
        <div className="mb-5">
          <Markdown>{q.body}</Markdown>
        </div>

        <div className="mb-5">
          {q.type === "SINGLE" && (
            <ChoiceQuestion
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              payload={payload as any}
              multi={false}
              value={cur.choice}
              onChange={(v) => patchCur({ choice: v })}
              disabled={graded}
            />
          )}
          {q.type === "MULTI" && (
            <ChoiceQuestion
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              payload={payload as any}
              multi={true}
              value={cur.choice}
              onChange={(v) => patchCur({ choice: v })}
              disabled={graded}
            />
          )}
          {q.type === "FILL" && (
            <FillQuestion value={cur.text} onChange={(v) => patchCur({ text: v })} disabled={graded} />
          )}
          {q.type === "QA" && (
            <QAQuestion value={cur.text} onChange={(v) => patchCur({ text: v })} disabled={graded} />
          )}
          {q.type === "CODING" && (
            <CodingQuestion
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              payload={payload as any}
              code={effectiveCode}
              onCodeChange={(c) => patchCur({ code: c })}
              results={cur.codingResults}
              onResults={(r) => patchCur({ codingResults: r })}
              disabled={graded}
            />
          )}
          {q.type === "PRINT" && (
            <PrintQuestion
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              payload={payload as any}
              code={effectiveCode}
              onCodeChange={(c) => patchCur({ code: c })}
              output={cur.printOutput}
              onOutput={(o) => patchCur({ printOutput: o })}
              disabled={graded}
            />
          )}
        </div>

        {graded && (
          <div
            className={`rounded-lg p-4 mb-1 ${
              cur.correct
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
            }`}
          >
            <div className="font-medium mb-2">
              {cur.correct ? "✓ 正确" : "✗ 错误"} · 得分 {cur.score} / {q.score}
            </div>
            {q.explanation && (
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                <Markdown>{q.explanation}</Markdown>
              </div>
            )}
          </div>
        )}
        {skipped && (
          <div className="rounded-lg p-3 mb-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm">
            已跳过。回到此卡可继续作答。
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={goPrev}
          disabled={idx === 0}
          className="px-4 py-2 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-zinc-400 disabled:opacity-40"
        >
          上一题
        </button>
        {!graded && cur.status === "idle" && (
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-zinc-400"
          >
            跳过
          </button>
        )}
        <button
          onClick={() => master.mutate()}
          disabled={master.isPending || cur.status === "mastered"}
          className="px-4 py-2 rounded-lg border border-blue-300 text-blue-700 dark:text-blue-300 bg-white dark:bg-zinc-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40"
        >
          已学会
        </button>
        <div className="flex-1" />
        {!graded ? (
          <button
            onClick={onSubmit}
            disabled={submit.isPending}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submit.isPending ? "提交中…" : "提交"}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={idx >= total - 1}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            下一题
          </button>
        )}
      </div>
    </div>
  );
}

function SumCard({ label, value, tone }: { label: string; value: number; tone: "green" | "red" | "zinc" | "blue" }) {
  const toneCls =
    tone === "green"
      ? "text-green-700 dark:text-green-300"
      : tone === "red"
      ? "text-red-700 dark:text-red-300"
      : tone === "blue"
      ? "text-blue-700 dark:text-blue-300"
      : "text-zinc-700 dark:text-zinc-300";
  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-4 text-center">
      <div className={`text-2xl font-semibold ${toneCls}`}>{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}
