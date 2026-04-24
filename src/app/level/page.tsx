"use client";

import { useQuery } from "@tanstack/react-query";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { StatCard } from "@/components/stats/StatCard";

interface LevelResp {
  totalScore: number;
  breakdown: {
    volume: number;
    accuracy: number;
    hardRate: number;
    coverage: number;
    retention: number;
    codingDepth: number;
  };
  level: { ali: string; tencent: string; baidu: string; internal: string };
  weakest: { key: string; score: number; advice: string }[];
}

const DIM_LABEL: Record<string, string> = {
  volume: "题量",
  accuracy: "正确率",
  hardRate: "HARD 通过",
  coverage: "标签覆盖",
  retention: "记忆深度",
  codingDepth: "代码题",
};

export default function LevelPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["level"],
    queryFn: async (): Promise<LevelResp> => {
      const r = await fetch("/api/level");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  if (isLoading || !data) {
    return <div className="max-w-3xl mx-auto px-6 py-8 text-zinc-500">加载中…</div>;
  }

  const radar = (Object.keys(data.breakdown) as Array<keyof typeof data.breakdown>).map((k) => ({
    dim: DIM_LABEL[k],
    score: +data.breakdown[k].toFixed(1),
  }));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">能力评估</h1>

      <div className="p-6 rounded-2xl border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-900 mb-6">
        <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">综合得分</div>
        <div className="text-6xl font-bold font-mono text-blue-700 dark:text-blue-300">
          {data.totalScore.toFixed(1)}
          <span className="text-2xl text-blue-400/60 ml-2">/ 100</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="阿里 P" value={data.level.ali} />
        <StatCard label="腾讯 T" value={data.level.tencent} />
        <StatCard label="百度 T" value={data.level.baidu} />
        <StatCard label="内部" value={data.level.internal} />
      </div>

      <section className="mb-6">
        <h2 className="text-base font-semibold mb-3 text-zinc-700 dark:text-zinc-300">六维能力雷达</h2>
        <div className="h-80 p-4 rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radar} outerRadius="75%">
              <PolarGrid stroke="#e4e4e7" />
              <PolarAngleAxis dataKey="dim" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-semibold mb-3 text-zinc-700 dark:text-zinc-300">改进建议</h2>
        <ul className="space-y-2">
          {data.weakest.map((w) => (
            <li
              key={w.key}
              className="p-4 rounded-xl border bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
            >
              <div className="text-sm font-semibold mb-1">
                {DIM_LABEL[w.key]} · {w.score.toFixed(1)} 分
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">{w.advice}</div>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-zinc-500">
        * v1 评估规则仅基于本机做题数据加权计算，未来会随题库扩充与规则迭代调整，仅供参考。
      </p>
    </div>
  );
}
