"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Markdown } from "@/components/Markdown";
import { ChoiceQuestion } from "@/components/question/ChoiceQuestion";
import { FillQuestion } from "@/components/question/FillQuestion";
import { QAQuestion } from "@/components/question/QAQuestion";
import { CodingQuestion } from "@/components/question/CodingQuestion";
import { PrintQuestion } from "@/components/question/PrintQuestion";
import { TYPE_LABEL, DIFFICULTY_LABEL, DIFFICULTY_CLASS } from "@/lib/labels";
import type { TestCaseResult } from "@/lib/types";

interface Question {
  id: string;
  type: string;
  title: string;
  body: string;
  difficulty: string;
  tags: string[];
  source: string;
  score: number;
  payload: Record<string, unknown>;
}

export default function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["question", id],
    queryFn: async (): Promise<{ question: Question }> => {
      const r = await fetch(`/api/questions/${id}`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const [choice, setChoice] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [codingResults, setCodingResults] = useState<TestCaseResult[]>([]);
  const [printOutput, setPrintOutput] = useState("");

  const submit = useMutation({
    mutationFn: async (userAnswer: unknown) => {
      const r = await fetch("/api/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: id, userAnswer }),
      });
      if (!r.ok) throw new Error("failed");
      return r.json() as Promise<{ attempt: { id: string } }>;
    },
    onSuccess: (d) => router.push(`/questions/${id}/result/${d.attempt.id}`),
  });

  if (isLoading || !data) {
    return <div className="max-w-3xl mx-auto px-6 py-8 text-zinc-500">加载中…</div>;
  }

  const q = data.question;
  const payload = q.payload;

  // 初始化 code（仅编程 / 打印题）
  const starter =
    (payload as { starterCode?: string }).starterCode ?? "";
  const effectiveCode = code ?? starter;

  function onSubmit() {
    let answer: unknown;
    switch (q.type) {
      case "SINGLE":
      case "MULTI":
        answer = choice;
        break;
      case "FILL":
      case "QA":
        answer = text;
        break;
      case "CODING":
        if (codingResults.length === 0) {
          alert("请先「运行测试」再提交");
          return;
        }
        answer = { code: effectiveCode, results: codingResults };
        break;
      case "PRINT":
        answer = printOutput;
        break;
      default:
        return;
    }
    submit.mutate(answer);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link href="/questions" className="text-sm text-blue-600 hover:underline">
        ← 返回题库
      </Link>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {TYPE_LABEL[q.type]}
        </span>
        <span className={`px-2 py-0.5 text-xs rounded ${DIFFICULTY_CLASS[q.difficulty]}`}>
          {DIFFICULTY_LABEL[q.difficulty]}
        </span>
        <span className="text-xs text-zinc-500">来源：{q.source}</span>
        <span className="text-xs text-zinc-500">满分 {q.score}</span>
      </div>

      <h1 className="text-2xl font-semibold mt-3 mb-4">{q.title}</h1>
      <div className="mb-6">
        <Markdown>{q.body}</Markdown>
      </div>

      <div className="mb-6">
        {q.type === "SINGLE" && (
          <ChoiceQuestion
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payload={payload as any}
            multi={false}
            value={choice}
            onChange={setChoice}
          />
        )}
        {q.type === "MULTI" && (
          <ChoiceQuestion
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payload={payload as any}
            multi={true}
            value={choice}
            onChange={setChoice}
          />
        )}
        {q.type === "FILL" && <FillQuestion value={text} onChange={setText} />}
        {q.type === "QA" && <QAQuestion value={text} onChange={setText} />}
        {q.type === "CODING" && (
          <CodingQuestion
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payload={payload as any}
            code={effectiveCode}
            onCodeChange={setCode}
            results={codingResults}
            onResults={setCodingResults}
          />
        )}
        {q.type === "PRINT" && (
          <PrintQuestion
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payload={payload as any}
            code={effectiveCode}
            onCodeChange={setCode}
            output={printOutput}
            onOutput={setPrintOutput}
          />
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSubmit}
          disabled={submit.isPending}
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submit.isPending ? "提交中…" : "提交"}
        </button>
        <Link
          href="/questions"
          className="px-5 py-2.5 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-zinc-400"
        >
          跳过
        </Link>
      </div>
    </div>
  );
}
