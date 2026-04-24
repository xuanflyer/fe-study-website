import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? undefined;
  const difficulty = searchParams.get("difficulty") ?? undefined;
  const source = searchParams.get("source") ?? undefined;
  const sort = searchParams.get("sort") ?? "recent";
  const wrongOnly = searchParams.get("wrongOnly") === "1";

  const where: Record<string, unknown> = {};
  if (type && type !== "ALL") where.type = type;
  if (difficulty && difficulty !== "ALL") where.difficulty = difficulty;
  if (source && source !== "ALL") where.source = source;

  const questions = await prisma.question.findMany({
    where,
    include: { attempts: { select: { correct: true, score: true, createdAt: true } } },
  });

  const enriched = questions.map((q) => {
    const n = q.attempts.length;
    const correctN = q.attempts.filter((a) => a.correct).length;
    const wrongN = n - correctN;
    const lastAt = q.attempts[0]?.createdAt ?? q.updatedAt;
    const minScore = n === 0 ? null : Math.min(...q.attempts.map((a) => a.score));
    return {
      id: q.id,
      type: q.type,
      title: q.title,
      difficulty: q.difficulty,
      tags: JSON.parse(q.tags) as string[],
      source: q.source,
      score: q.score,
      stats: { n, correctN, wrongN, lastAt, minScore },
    };
  });

  const filtered = wrongOnly ? enriched.filter((q) => q.stats.wrongN > 0) : enriched;

  filtered.sort((a, b) => {
    switch (sort) {
      case "mostDone":
        return b.stats.n - a.stats.n;
      case "mostCorrect":
        return b.stats.correctN - a.stats.correctN;
      case "mostWrong":
        return b.stats.wrongN - a.stats.wrongN;
      case "lowestScore":
        return (a.stats.minScore ?? Number.POSITIVE_INFINITY) - (b.stats.minScore ?? Number.POSITIVE_INFINITY);
      case "recent":
      default:
        return new Date(b.stats.lastAt).getTime() - new Date(a.stats.lastAt).getTime();
    }
  });

  return NextResponse.json({ questions: filtered });
}
