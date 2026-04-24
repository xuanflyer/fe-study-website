import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { gradeChoice } from "@/server/grading/grade-choice";
import { gradeFill } from "@/server/grading/grade-fill";
import { gradePrint } from "@/server/grading/grade-print";
import { gradeQA } from "@/server/grading/grade-qa";
import { gradeCoding } from "@/server/grading/grade-coding";
import { nextStage, nextReviewAt } from "@/server/schedule/ebbinghaus";
import type { GradeResult, TestCaseResult } from "@/lib/types";

const Body = z.object({
  questionId: z.string(),
  userAnswer: z.unknown(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { questionId, userAnswer, userId, sessionId } = parsed.data;
  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = JSON.parse(q.payload);
  let result: GradeResult;
  switch (q.type) {
    case "SINGLE":
    case "MULTI":
      result = gradeChoice(payload, (userAnswer as string[]) ?? [], q.score);
      break;
    case "FILL":
      result = gradeFill(payload, String(userAnswer ?? ""), q.score);
      break;
    case "PRINT":
      result = gradePrint(payload, String(userAnswer ?? ""), q.score);
      break;
    case "QA":
      result = gradeQA(payload, String(userAnswer ?? ""), q.score);
      break;
    case "CODING": {
      const results = (userAnswer as { results?: TestCaseResult[] })?.results ?? [];
      result = gradeCoding(results, q.score);
      break;
    }
    default:
      return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
  }

  const uid = userId ?? "local";
  const attempt = await prisma.attempt.create({
    data: {
      questionId,
      userId: uid,
      sessionId: sessionId ?? null,
      userAnswer: JSON.stringify(userAnswer ?? null),
      score: result.score,
      correct: result.correct,
      details: JSON.stringify(result.details),
    },
  });

  // Update Ebbinghaus review state.
  const now = new Date();
  const existing = await prisma.reviewState.findUnique({ where: { questionId } });
  const prevStage = existing?.stage ?? 0;
  const newStage = nextStage(prevStage, result.correct);
  const review = nextReviewAt(prevStage, result.correct, now);
  await prisma.reviewState.upsert({
    where: { questionId },
    create: {
      userId: uid,
      questionId,
      stage: newStage,
      nextReviewAt: review,
      lastReviewedAt: now,
    },
    update: {
      stage: newStage,
      nextReviewAt: review,
      lastReviewedAt: now,
    },
  });

  return NextResponse.json({ attempt: { ...attempt, details: result.details } });
}
