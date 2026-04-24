"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TYPE_LABEL, DIFFICULTY_LABEL, DIFFICULTY_CLASS } from "@/lib/labels";

interface PlanDetail {
  id: string;
  name: string;
  filters: { count: number; tags?: string[]; types?: string[]; difficulties?: string[] };
  createdAt: string;
  dueAt: string | null;
  items: {
    questionId: string;
    order: number;
    done: boolean;
    question: {
      id: string;
      type: string;
      title: string;
      difficulty: string;
      source: string;
      score: number;
    };
  }[];
}

export default function CustomPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["custom-plan", id],
    queryFn: async (): Promise<PlanDetail> => {
      const r = await fetch(`/api/custom-plans/${id}`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  if (isLoading || !data) {
    return <div className="max-w-3xl mx-auto px-6 py-8 text-zinc-500">加载中…</div>;
  }

  const completed = data.items.filter((i) => i.done).length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link href="/plan" className="text-sm text-blue-600 hover:underline">
        ← 学习计划
      </Link>

      <h1 className="text-2xl font-semibold mt-3 mb-2">{data.name}</h1>
      <div className="text-sm text-zinc-500 mb-6">
        {completed} / {data.items.length} 完成
        {data.dueAt && ` · 截止 ${new Date(data.dueAt).toLocaleDateString()}`}
      </div>

      <ul className="space-y-2">
        {data.items.map((it, i) => {
          const q = it.question;
          return (
            <li
              key={it.questionId}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                it.done
                  ? "border-green-300 bg-green-50/50 dark:bg-green-950/20"
                  : "bg-white dark:bg-zinc-900 dark:border-zinc-800"
              }`}
            >
              <span className="text-zinc-500 text-sm w-6">{i + 1}</span>
              {it.done && <span className="text-green-600">✓</span>}
              <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {TYPE_LABEL[q.type]}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded ${DIFFICULTY_CLASS[q.difficulty]}`}>
                {DIFFICULTY_LABEL[q.difficulty]}
              </span>
              <span className="flex-1 truncate">{q.title}</span>
              <Link
                href={`/questions/${q.id}`}
                className="text-sm text-blue-600 hover:underline whitespace-nowrap"
              >
                {it.done ? "重做" : "去做"} →
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
