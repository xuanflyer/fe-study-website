"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TYPE_LABEL, DIFFICULTY_LABEL, DIFFICULTY_CLASS } from "@/lib/labels";
import { NewPlanModal } from "@/components/plan/NewPlanModal";

interface PlanItem {
  questionId: string;
  stage: number;
  nextReviewAt: string;
  overdue: boolean;
  question: {
    id: string;
    type: string;
    title: string;
    difficulty: string;
    source: string;
    score: number;
  };
}

interface TodayResp {
  range: "today";
  now: string;
  total: number;
  completedToday: number;
  items: PlanItem[];
}

interface WeekResp {
  range: "week";
  now: string;
  days: { date: string; items: PlanItem[] }[];
}

export default function PlanPage() {
  const [tab, setTab] = useState<"today" | "week" | "custom">("today");
  const { data, isLoading } = useQuery({
    queryKey: ["plan", tab],
    queryFn: async (): Promise<TodayResp | WeekResp> => {
      const r = await fetch(`/api/plan?range=${tab}`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    enabled: tab !== "custom",
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-4">学习计划</h1>

      <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 w-fit mb-6">
        {(["today", "week", "custom"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${
              tab === t
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {t === "today" ? "今日复习" : t === "week" ? "本周计划" : "自建计划"}
          </button>
        ))}
      </div>

      {tab === "custom" ? (
        <CustomPlansView />
      ) : isLoading || !data ? (
        <div className="text-zinc-500">加载中…</div>
      ) : data.range === "today" ? (
        <TodayView data={data} />
      ) : (
        <WeekView data={data} />
      )}
    </div>
  );
}

interface CustomPlanSummary {
  id: string;
  name: string;
  filters: { count: number; tags?: string[]; types?: string[]; difficulties?: string[] };
  createdAt: string;
  dueAt: string | null;
  total: number;
  completed: number;
}

function CustomPlansView() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const list = useQuery({
    queryKey: ["custom-plans"],
    queryFn: async (): Promise<{ plans: CustomPlanSummary[] }> => {
      const r = await fetch("/api/custom-plans");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/custom-plans/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-plans"] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-zinc-500">
          共 {list.data?.plans.length ?? 0} 个自建计划
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          + 新建计划
        </button>
      </div>

      {list.isLoading || !list.data ? (
        <div className="text-zinc-500 text-sm">加载中…</div>
      ) : list.data.plans.length === 0 ? (
        <div className="text-zinc-500 text-sm">暂无自建计划</div>
      ) : (
        <ul className="space-y-2">
          {list.data.plans.map((p) => {
            const pct = p.total ? Math.round((p.completed / p.total) * 100) : 0;
            return (
              <li
                key={p.id}
                className="p-4 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <Link
                    href={`/plan/custom/${p.id}`}
                    className="font-semibold hover:text-blue-600"
                  >
                    {p.name}
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`删除「${p.name}」？`)) del.mutate(p.id);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    删除
                  </button>
                </div>
                <div className="text-xs text-zinc-500 mb-2">
                  创建于 {new Date(p.createdAt).toLocaleDateString()}
                  {p.dueAt && ` · 截止 ${new Date(p.dueAt).toLocaleDateString()}`}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">
                    {p.completed} / {p.total}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NewPlanModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function TodayView({ data }: { data: TodayResp }) {
  if (data.items.length === 0) {
    return (
      <div className="text-zinc-500">
        今日无待复习题目。已完成 {data.completedToday} 题。
      </div>
    );
  }
  return (
    <div>
      <div className="mb-4 text-sm text-zinc-500">
        待复习 <span className="text-blue-600 font-semibold">{data.total}</span> 题 · 今日已完成{" "}
        <span className="text-green-600 font-semibold">{data.completedToday}</span> 题
      </div>
      <ul className="space-y-2">
        {data.items.map((it) => (
          <PlanRow key={it.questionId} item={it} />
        ))}
      </ul>
    </div>
  );
}

function WeekView({ data }: { data: WeekResp }) {
  return (
    <div className="space-y-5">
      {data.days.map((d) => (
        <div key={d.date}>
          <div className="text-sm font-semibold mb-2">
            {d.date}
            <span className="ml-2 text-xs text-zinc-500 font-normal">{d.items.length} 题</span>
          </div>
          {d.items.length === 0 ? (
            <div className="text-xs text-zinc-400 pl-2">—</div>
          ) : (
            <ul className="space-y-2">
              {d.items.map((it) => (
                <PlanRow key={it.questionId} item={it} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function PlanRow({ item }: { item: PlanItem }) {
  const q = item.question;
  return (
    <li
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        item.overdue
          ? "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800"
          : "bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm"
      }`}
    >
      <span className="px-2 py-0.5 text-xs rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 font-medium shrink-0">
        {TYPE_LABEL[q.type]}
      </span>
      <span className={`px-2 py-0.5 text-xs rounded-md font-medium shrink-0 ${DIFFICULTY_CLASS[q.difficulty]}`}>
        {DIFFICULTY_LABEL[q.difficulty]}
      </span>
      <span className="flex-1 truncate text-sm">{q.title}</span>
      <span className="text-xs text-zinc-400 shrink-0">阶段 {item.stage}</span>
      <Link
        href={`/questions/${q.id}`}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap shrink-0"
      >
        去做 →
      </Link>
    </li>
  );
}
