"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TYPE_LABEL, DIFFICULTY_LABEL } from "@/lib/labels";

type Mode = "RANDOM_N" | "TIMED";

const TYPES = ["SINGLE", "MULTI", "FILL", "CODING", "PRINT", "QA"];
const DIFFS = ["EASY", "MEDIUM", "HARD"];

interface HistoryItem {
  id: string;
  mode: Mode;
  startedAt: string;
  endedAt: string | null;
  totalScore: number;
  maxScore: number;
  config: { count?: number; durationSec?: number };
}

export default function InterviewEntryPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("RANDOM_N");
  const [count, setCount] = useState(10);
  const [durationMin, setDurationMin] = useState(30);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [diffFilter, setDiffFilter] = useState<string[]>([]);

  const history = useQuery({
    queryKey: ["interviewList"],
    queryFn: async (): Promise<{ sessions: HistoryItem[] }> => {
      const r = await fetch("/api/interview?list=1");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const start = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          count: mode === "RANDOM_N" ? count : count,
          durationSec: mode === "TIMED" ? durationMin * 60 : undefined,
          typeFilter: typeFilter.length ? typeFilter : undefined,
          difficultyFilter: diffFilter.length ? diffFilter : undefined,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "failed");
      return r.json() as Promise<{ sessionId: string }>;
    },
    onSuccess: (d) => router.push(`/interview/${d.sessionId}`),
  });

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) => {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">模拟面试</h1>

      <section className="p-6 rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
        <h2 className="font-semibold mb-4 text-zinc-700 dark:text-zinc-300">新建场次</h2>

        <div className="mb-5">
          <div className="text-xs font-medium text-zinc-500 mb-2">模式</div>
          <div className="flex gap-2">
            {(["RANDOM_N", "TIMED"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 text-sm rounded-xl border font-medium transition-all ${
                  mode === m
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                    : "dark:border-zinc-700 hover:border-blue-400 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {m === "RANDOM_N" ? "随机 N 题" : "定时模式"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-2">题数</div>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(+e.target.value)}
              className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            />
          </div>
          {mode === "TIMED" && (
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-2">时长（分钟）</div>
              <input
                type="number"
                min={1}
                max={240}
                value={durationMin}
                onChange={(e) => setDurationMin(+e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
              />
            </div>
          )}
        </div>

        <div className="mb-5">
          <div className="text-xs font-medium text-zinc-500 mb-2">题型（留空=全部）</div>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => toggle(typeFilter, setTypeFilter, t)}
                className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${
                  typeFilter.includes(t)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-blue-400"
                }`}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-xs font-medium text-zinc-500 mb-2">难度</div>
          <div className="flex flex-wrap gap-2">
            {DIFFS.map((d) => (
              <button
                key={d}
                onClick={() => toggle(diffFilter, setDiffFilter, d)}
                className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${
                  diffFilter.includes(d)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-blue-400"
                }`}
              >
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => start.mutate()}
          disabled={start.isPending}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition shadow-sm shadow-blue-500/20"
        >
          {start.isPending ? "创建中…" : "开始面试"}
        </button>
        {start.isError && (
          <div className="mt-2 text-sm text-red-500">{String(start.error)}</div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold mb-3">历史场次</h2>
        {history.isLoading || !history.data ? (
          <div className="text-zinc-500 text-sm">加载中…</div>
        ) : history.data.sessions.length === 0 ? (
          <div className="text-zinc-500 text-sm">暂无记录</div>
        ) : (
          <ul className="space-y-2">
            {history.data.sessions.map((s) => (
              <li
                key={s.id}
                className="p-3 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 flex items-center gap-3"
              >
                <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {s.mode === "RANDOM_N" ? "随机" : "定时"}
                </span>
                <span className="text-sm flex-1 truncate">
                  {new Date(s.startedAt).toLocaleString()}
                </span>
                <span className="text-sm font-mono text-zinc-500">
                  {s.totalScore} / {s.maxScore}
                </span>
                <Link
                  href={
                    s.endedAt ? `/interview/${s.id}/result` : `/interview/${s.id}`
                  }
                  className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                >
                  {s.endedAt ? "查看" : "继续"} →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
