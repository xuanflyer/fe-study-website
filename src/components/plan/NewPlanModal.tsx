"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TYPE_LABEL, DIFFICULTY_LABEL } from "@/lib/labels";

const TYPES = ["SINGLE", "MULTI", "FILL", "CODING", "PRINT", "QA"];
const DIFFS = ["EASY", "MEDIUM", "HARD"];

export function NewPlanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [count, setCount] = useState(10);
  const [types, setTypes] = useState<string[]>([]);
  const [diffs, setDiffs] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState("");

  const tagsQ = useQuery({
    queryKey: ["question-tags"],
    queryFn: async (): Promise<{ tags: string[] }> => {
      const r = await fetch("/api/questions/tags");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    enabled: open,
  });

  const create = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/custom-plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || `自建计划 ${new Date().toLocaleDateString()}`,
          filters: {
            count,
            types: types.length ? types : undefined,
            difficulties: diffs.length ? diffs : undefined,
            tags: tags.length ? tags : undefined,
          },
          dueAt: dueAt || undefined,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-plans"] });
      onClose();
      setName("");
      setTypes([]);
      setDiffs([]);
      setTags([]);
    },
  });

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) => {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 border dark:border-zinc-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">新建临时学习计划</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs text-zinc-500 mb-1">名称</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：周末算法集训"
              className="w-full px-3 py-1.5 rounded border bg-white dark:bg-zinc-900 dark:border-zinc-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-zinc-500 mb-1">题数</div>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(+e.target.value)}
                className="w-full px-3 py-1.5 rounded border bg-white dark:bg-zinc-900 dark:border-zinc-800"
              />
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">截止日期（可选）</div>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-3 py-1.5 rounded border bg-white dark:bg-zinc-900 dark:border-zinc-800"
              />
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500 mb-1">题型（留空=全部）</div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => toggle(types, setTypes, t)}
                  className={`px-2 py-1 text-xs rounded border ${
                    types.includes(t)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "dark:border-zinc-800"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500 mb-1">难度</div>
            <div className="flex flex-wrap gap-2">
              {DIFFS.map((d) => (
                <button
                  key={d}
                  onClick={() => toggle(diffs, setDiffs, d)}
                  className={`px-2 py-1 text-xs rounded border ${
                    diffs.includes(d)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "dark:border-zinc-800"
                  }`}
                >
                  {DIFFICULTY_LABEL[d]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500 mb-1">标签（任一命中）</div>
            {tagsQ.isLoading ? (
              <div className="text-sm text-zinc-400">加载中…</div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {(tagsQ.data?.tags ?? []).map((t) => (
                  <button
                    key={t}
                    onClick={() => toggle(tags, setTags, t)}
                    className={`px-2 py-1 text-xs rounded border ${
                      tags.includes(t)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "dark:border-zinc-800"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {create.isError && (
            <div className="text-sm text-red-500">{String(create.error)}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border dark:border-zinc-800"
            >
              取消
            </button>
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending}
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {create.isPending ? "创建中…" : "创建"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
