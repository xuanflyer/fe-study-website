"use client";

import { useState } from "react";
import { CodeEditor } from "./CodeEditor";
import type { CodingPayload, TestCaseResult } from "@/lib/types";
import { runCodingTests } from "@/lib/runner/webcontainer";

interface Props {
  payload: CodingPayload;
  code: string;
  onCodeChange: (c: string) => void;
  results: TestCaseResult[];
  onResults: (r: TestCaseResult[]) => void;
  disabled?: boolean;
}

export function CodingQuestion({
  payload,
  code,
  onCodeChange,
  results,
  onResults,
  disabled,
}: Props) {
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setErr(null);
    try {
      const r = await runCodingTests(code, payload.tests, payload.entryFn);
      onResults(r);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-3">
      <CodeEditor
        value={code}
        onChange={onCodeChange}
        language={payload.language === "ts" ? "typescript" : "javascript"}
        readOnly={disabled}
      />
      <div className="flex gap-2">
        <button
          onClick={run}
          disabled={running || disabled}
          className="px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {running ? "运行中…" : "运行测试"}
        </button>
        <span className="text-xs text-zinc-500 self-center">
          首次运行需加载 WebContainer（~几秒）
        </span>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {results.length > 0 && <TestResults results={results} />}
    </div>
  );
}

export function TestResults({ results }: { results: TestCaseResult[] }) {
  return (
    <ul className="space-y-2">
      {results.map((r, i) => (
        <li
          key={i}
          className={`p-3 rounded-lg border text-sm ${
            r.passed
              ? "border-green-500 bg-green-50 dark:bg-green-950/30"
              : "border-red-500 bg-red-50 dark:bg-red-950/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {r.passed ? "✓" : "✗"} {r.name}
            </span>
          </div>
          {!r.passed && (
            <div className="mt-2 font-mono text-xs space-y-1">
              <div>期望：{JSON.stringify(r.expected)}</div>
              <div>实际：{r.error ? r.error : JSON.stringify(r.actual)}</div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
