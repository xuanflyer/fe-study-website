"use client";

import { useState } from "react";
import { CodeEditor } from "./CodeEditor";
import type { PrintPayload } from "@/lib/types";
import { runPrint } from "@/lib/runner/webcontainer";

interface Props {
  payload: PrintPayload;
  code: string;
  onCodeChange: (c: string) => void;
  output: string;
  onOutput: (o: string) => void;
  disabled?: boolean;
}

export function PrintQuestion({ payload, code, onCodeChange, output, onOutput, disabled }: Props) {
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setErr(null);
    try {
      const r = await runPrint(code);
      onOutput(r.output);
      if (r.error) setErr(r.error);
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
      <div className="flex gap-2 items-center">
        <button
          onClick={run}
          disabled={running || disabled}
          className="px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {running ? "运行中…" : "运行"}
        </button>
        <span className="text-xs text-zinc-500">
          将运行结果（每行一个 console.log）作为答案提交
        </span>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div>
        <div className="text-xs text-zinc-500 mb-1">输出（将作为答案提交）</div>
        <textarea
          value={output}
          onChange={(e) => onOutput(e.target.value)}
          disabled={disabled}
          rows={5}
          className="w-full px-3 py-2 rounded-lg border bg-zinc-900 text-zinc-100 dark:border-zinc-700 font-mono text-sm"
        />
      </div>
    </div>
  );
}
