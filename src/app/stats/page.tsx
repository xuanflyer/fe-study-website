"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { StatCard } from "@/components/stats/StatCard";
import { TYPE_LABEL, DIFFICULTY_LABEL } from "@/lib/labels";

type Range = "day" | "week" | "month";

interface StatsResp {
  range: Range;
  totals: { attempts: number; correct: number; accuracy: number; uniqueQuestions: number; totalQuestions: number; studiedQuestions: number };
  byDay: { date: string; attempts: number; correct: number }[];
  byType: { type: string; attempts: number; correct: number; accuracy: number }[];
  byDifficulty: { difficulty: string; attempts: number; correct: number; accuracy: number }[];
  byTag: { tag: string; attempts: number; correct: number; accuracy: number }[];
  streakDays: number;
}

export default function StatsPage() {
  const [range, setRange] = useState<Range>("week");
  const { data, isLoading } = useQuery({
    queryKey: ["stats", range],
    queryFn: async (): Promise<StatsResp> => {
      const r = await fetch(`/api/stats?range=${range}`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">学习统计</h1>
        <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
          {(["day", "week", "month"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${
                range === r
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {r === "day" ? "今日" : r === "week" ? "本周" : "本月"}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <StatCard label="题库总题数" value={data.totals.totalQuestions} accent="blue" />
            <StatCard
              label="已学题数"
              value={data.totals.studiedQuestions}
              sub={`/ ${data.totals.totalQuestions} 题`}
              accent="green"
            />
            <StatCard
              label="覆盖率"
              value={data.totals.totalQuestions ? `${((data.totals.studiedQuestions / data.totals.totalQuestions) * 100).toFixed(1)}%` : "0%"}
              accent="purple"
            />
            <StatCard label="总作答" value={data.totals.attempts} />
            <StatCard
              label="正确率"
              value={`${(data.totals.accuracy * 100).toFixed(1)}%`}
              accent="green"
            />
            <StatCard label="连续打卡" value={`${data.streakDays} 天`} accent="orange" />
          </div>

          <Section title="每日活跃">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="attempts" name="作答" stroke="#3b82f6" />
                  <Line type="monotone" dataKey="correct" name="答对" stroke="#22c55e" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <div className="grid md:grid-cols-2 gap-6">
            <Section title="按题型 · 正确率">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.byType.map((t) => ({
                      name: TYPE_LABEL[t.type] ?? t.type,
                      正确率: +(t.accuracy * 100).toFixed(1),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="正确率" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title="按难度 · 正确率">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.byDifficulty.map((d) => ({
                      name: DIFFICULTY_LABEL[d.difficulty] ?? d.difficulty,
                      正确率: +(d.accuracy * 100).toFixed(1),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="正确率" fill="#a855f7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>

          <Section title="按标签 Top10 · 正确率">
            {data.byTag.length === 0 ? (
              <div className="text-sm text-zinc-500">暂无数据</div>
            ) : (
              <div style={{ height: Math.max(220, data.byTag.length * 28) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={data.byTag.map((t) => ({
                      tag: t.tag,
                      正确率: +(t.accuracy * 100).toFixed(1),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="tag" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="正确率" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold mb-3 text-zinc-700 dark:text-zinc-300">{title}</h2>
      <div className="p-4 rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
        {children}
      </div>
    </section>
  );
}
