"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useQuery } from "@tanstack/react-query";
import { useStores } from "@/stores/StoreProvider";
import { TYPE_LABEL, DIFFICULTY_LABEL, DIFFICULTY_CLASS } from "@/lib/labels";
import type { SortKey } from "@/stores/rootStore";

interface QuestionListItem {
  id: string;
  type: string;
  title: string;
  difficulty: string;
  tags: string[];
  source: string;
  score: number;
  stats: {
    n: number;
    correctN: number;
    wrongN: number;
    minScore: number | null;
  };
}

const TYPES = ["ALL", "SINGLE", "MULTI", "FILL", "CODING", "PRINT", "QA"];
const DIFFS = ["ALL", "EASY", "MEDIUM", "HARD"];
const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "最近学习" },
  { key: "mostDone", label: "最多学习" },
  { key: "mostCorrect", label: "最多正确" },
  { key: "mostWrong", label: "最多错误" },
  { key: "lowestScore", label: "最差评分" },
];

export const QuestionList = observer(function QuestionList() {
  const { ui } = useStores();
  const qs = ui.toQuery();

  const { data, isLoading } = useQuery({
    queryKey: ["questions", qs],
    queryFn: async (): Promise<{ questions: QuestionListItem[] }> => {
      const r = await fetch(`/api/questions?${qs}`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const { data: sourcesData } = useQuery({
    queryKey: ["question-sources"],
    queryFn: async (): Promise<{ sources: { source: string; count: number }[] }> => {
      const r = await fetch(`/api/questions/sources`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">题库</h1>

      {/* Filters */}
      <div className="p-4 rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 space-y-3 mb-6 shadow-sm">
        <FilterRow label="类型">
          {TYPES.map((t) => (
            <Chip key={t} active={ui.type === t} onClick={() => ui.setType(t)}>
              {t === "ALL" ? "全部" : TYPE_LABEL[t]}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="难度">
          {DIFFS.map((d) => (
            <Chip key={d} active={ui.difficulty === d} onClick={() => ui.setDifficulty(d)}>
              {d === "ALL" ? "全部" : DIFFICULTY_LABEL[d]}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="来源">
          <select
            value={ui.source}
            onChange={(e) => ui.setSource(e.target.value)}
            className="px-3 py-1 rounded-full text-sm border bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 max-w-xs transition"
          >
            <option value="ALL">全部</option>
            {sourcesData?.sources.map((s) => (
              <option key={s.source} value={s.source}>
                {s.source} ({s.count})
              </option>
            ))}
          </select>
        </FilterRow>
        <FilterRow label="排序">
          {SORTS.map((s) => (
            <Chip key={s.key} active={ui.sort === s.key} onClick={() => ui.setSort(s.key)}>
              {s.label}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="筛选">
          <Chip active={ui.wrongOnly} onClick={() => ui.setWrongOnly(!ui.wrongOnly)}>
            只看错题
          </Chip>
        </FilterRow>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="text-xs text-zinc-400 mb-3">共 {data?.questions.length ?? 0} 题</div>
          <ul className="space-y-2">
            {data?.questions.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/questions/${q.id}`}
                  className="flex items-start gap-3 p-4 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all group"
                >
                  <div className="flex gap-2 shrink-0 pt-0.5">
                    <span className="px-2 py-0.5 text-xs rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 font-medium">
                      {TYPE_LABEL[q.type]}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-md font-medium ${DIFFICULTY_CLASS[q.difficulty]}`}>
                      {DIFFICULTY_LABEL[q.difficulty]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
                      {q.title}
                    </div>
                    <div className="mt-1.5 text-xs text-zinc-400 flex gap-3 flex-wrap items-center">
                      <span>来源：{q.source}</span>
                      <span className="text-zinc-300 dark:text-zinc-600">·</span>
                      <span>满分 {q.score}</span>
                      <span className="text-zinc-300 dark:text-zinc-600">·</span>
                      <span>
                        做过 {q.stats.n} · 正确 {q.stats.correctN} · 错误 {q.stats.wrongN}
                      </span>
                      {q.tags.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-zinc-300 dark:text-zinc-600 group-hover:text-blue-400 transition-colors text-lg shrink-0">→</span>
                </Link>
              </li>
            ))}
            {data?.questions.length === 0 && (
              <li className="py-12 text-center text-zinc-400">没有匹配的题目</li>
            )}
          </ul>
        </>
      )}
    </div>
  );
});

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-zinc-400 w-10 shrink-0">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
          : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400"
      }`}
    >
      {children}
    </button>
  );
}
