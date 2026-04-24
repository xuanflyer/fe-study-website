import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { assessLevel } from "@/server/level/rubric";

export async function GET() {
  const [attempts, reviewStates, questions] = await Promise.all([
    prisma.attempt.findMany({ select: { questionId: true, correct: true } }),
    prisma.reviewState.findMany({ select: { questionId: true, stage: true } }),
    prisma.question.findMany({ select: { id: true, type: true, difficulty: true, tags: true } }),
  ]);

  const allTagSet = new Set<string>();
  const parsed = questions.map((q) => {
    let tags: string[] = [];
    try {
      tags = JSON.parse(q.tags) as string[];
    } catch {
      tags = [];
    }
    for (const t of tags) allTagSet.add(t);
    return { id: q.id, type: q.type, difficulty: q.difficulty, tags };
  });

  const result = assessLevel({
    attempts,
    questions: parsed,
    reviewStates,
    totalTagCount: allTagSet.size,
  });

  return NextResponse.json(result);
}
