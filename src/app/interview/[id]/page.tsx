"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  source: string;
  score: number;
  payload: Record<string, unknown>;
}

interface Attempt {
  id: string;
  questionId: string;
  score: number;
  correct: boolean;
}

interface SessionResp {
  session: {
    id: string;
    mode: "RANDOM_N" | "TIMED";
    config: { count?: number; durationSec?: number };
    questionIds: string[];
    startedAt: string;
    endedAt: string | null;
    totalScore: number;
    maxScore: number;
    attempts: Attempt[];
  };
  questions: Question[];
}

export default function InterviewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const router = useRouter();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["interviewSession", sessionId],
    queryFn: async (): Promise<SessionResp> => {
      const r = await fetch(`/api/interview/${sessionId}`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const answeredIds = useMemo(
    () => new Set((data?.session.attempts ?? []).map((a) => a.questionId)),
    [data]
  );
  const firstUnansweredIdx = useMemo(() => {
    if (!data) return 0;
    const i = data.questions.findIndex((q) => !answeredIds.has(q.id));
    return i === -1 ? data.questions.length - 1 : i;
  }, [data, answeredIds]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (data) setIdx(firstUnansweredIdx);
  }, [data, firstUnansweredIdx]);

  // Per-question local answer state — reset on switch
  const [choice, setChoice] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [codingResults, setCodingResults] = useState<TestCaseResult[]>([]);
  const [printOutput, setPrintOutput] = useState("");

  useEffect(() => {
    setChoice([]);
    setText("");
    setCode(null);
    setCodingResults([]);
    setPrintOutput("");
  }, [idx]);

  // Countdown for TIMED
  const durationSec = data?.session.config.durationSec ?? 0;
  const startMs = data ? new Date(data.session.startedAt).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!data || data.session.mode !== "TIMED" || data.session.endedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [data]);
  const remainingSec =
    data && data.session.mode === "TIMED"
      ? Math.max(0, durationSec - Math.floor((now - startMs) / 1000))
      : null;

  const finish = useMutation({
    mutationFn: async () => {
      const total = (data?.session.attempts ?? []).reduce((s, a) => s + a.score, 0);
      await fetch(`/api/interview/${sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endedAt: new Date().toISOString(), totalScore: total }),
      });
    },
    onSuccess: () => router.push(`/interview/${sessionId}/result`),
  });

  const submit = useMutation({
    mutationFn: async (userAnswer: unknown) => {
      const r = await fetch("/api/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: q!.id, userAnswer, sessionId }),
      });
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    onSuccess: async () => {
      await refetch();
      if (!data) return;
      if (idx >= data.questions.length - 1) {
        finish.mutate();
      } else {
        setIdx(idx + 1);
      }
    },
  });

  // Auto-finish when timer hits zero
  useEffect(() => {
    if (remainingSec === 0 && data && !data.session.endedAt && !finish.isPending) {
      finish.mutate();
    }
  }, [remainingSec, data, finish]);

  if (isLoading || !data) {
    return <div className="max-w-3xl mx-auto px-6 py-8 text-zinc-500">加载中…</div>;
  }

  // If already ended, redirect to result
  if (data.session.endedAt) {
    router.replace(`/interview/${sessionId}/result`);
    return null;
  }

  const q = data.questions[idx];
  if (!q) return <div className="max-w-3xl mx-auto px-6 py-8 text-zinc-500">题目缺失</div>;

  const starter = (q.payload as { starterCode?: string }).starterCode ?? "";
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

  const total = data.questions.length;
  const answeredCount = answeredIds.size;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-zinc-500">
          第 {idx + 1} / {total} 题 · 已答 {answeredCount}
        </div>
        {remainingSec !== null && (
          <div className="font-mono text-sm">
            剩余{" "}
            <span className={remainingSec < 60 ? "text-red-500 font-semibold" : ""}>
              {Math.floor(remainingSec / 60)}:
              {String(remainingSec % 60).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {data.questions.map((qq, i) => (
          <button
            key={qq.id}
            onClick={() => setIdx(i)}
            className={`w-7 h-7 text-xs rounded ${
              i === idx
                ? "bg-blue-600 text-white"
                : answeredIds.has(qq.id)
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {TYPE_LABEL[q.type]}
        </span>
        <span className={`px-2 py-0.5 text-xs rounded ${DIFFICULTY_CLASS[q.difficulty]}`}>
          {DIFFICULTY_LABEL[q.difficulty]}
        </span>
        <span className="text-xs text-zinc-500">满分 {q.score}</span>
      </div>

      <h1 className="text-xl font-semibold mt-3 mb-4">{q.title}</h1>
      <div className="mb-6">
        <Markdown>{q.body}</Markdown>
      </div>

      <div className="mb-6">
        {q.type === "SINGLE" && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <ChoiceQuestion payload={q.payload as any} multi={false} value={choice} onChange={setChoice} />
        )}
        {q.type === "MULTI" && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <ChoiceQuestion payload={q.payload as any} multi={true} value={choice} onChange={setChoice} />
        )}
        {q.type === "FILL" && <FillQuestion value={text} onChange={setText} />}
        {q.type === "QA" && <QAQuestion value={text} onChange={setText} />}
        {q.type === "CODING" && (
          <CodingQuestion
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payload={q.payload as any}
            code={effectiveCode}
            onCodeChange={setCode}
            results={codingResults}
            onResults={setCodingResults}
          />
        )}
        {q.type === "PRINT" && (
          <PrintQuestion
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payload={q.payload as any}
            code={effectiveCode}
            onCodeChange={setCode}
            output={printOutput}
            onOutput={setPrintOutput}
          />
        )}
      </div>

      <div className="flex gap-3 justify-between">
        <button
          onClick={() => setIdx(Math.max(0, idx - 1))}
          disabled={idx === 0}
          className="px-4 py-2 rounded-lg border dark:border-zinc-800 disabled:opacity-40"
        >
          上一题
        </button>
        <div className="flex gap-3">
          {!answeredIds.has(q.id) && (
            <button
              onClick={onSubmit}
              disabled={submit.isPending}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submit.isPending ? "提交中…" : "提交"}
            </button>
          )}
          {idx < total - 1 && (
            <button
              onClick={() => setIdx(idx + 1)}
              className="px-4 py-2 rounded-lg border dark:border-zinc-800"
            >
              下一题
            </button>
          )}
          {idx === total - 1 && (
            <button
              onClick={() => finish.mutate()}
              disabled={finish.isPending}
              className="px-5 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {finish.isPending ? "结束中…" : "结束面试"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
