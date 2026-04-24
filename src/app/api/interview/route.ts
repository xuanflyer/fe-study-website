import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";

const Body = z.object({
  mode: z.enum(["RANDOM_N", "TIMED"]),
  count: z.number().int().min(1).max(100).optional(),
  durationSec: z.number().int().min(60).max(60 * 60 * 4).optional(),
  typeFilter: z.array(z.string()).optional(),
  difficultyFilter: z.array(z.string()).optional(),
  userId: z.string().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("list") === "1") {
    const sessions = await prisma.interviewSession.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    });
    return NextResponse.json({
      sessions: sessions.map((s) => ({
        ...s,
        config: JSON.parse(s.config),
        questionIds: JSON.parse(s.questionIds),
      })),
    });
  }
  return NextResponse.json({ error: "Unsupported" }, { status: 400 });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { mode, count, durationSec, typeFilter, difficultyFilter, userId } = parsed.data;

  const effectiveCount = mode === "RANDOM_N" ? count ?? 10 : count ?? 20;

  const where: {
    type?: { in: string[] };
    difficulty?: { in: string[] };
  } = {};
  if (typeFilter && typeFilter.length > 0) where.type = { in: typeFilter };
  if (difficultyFilter && difficultyFilter.length > 0) where.difficulty = { in: difficultyFilter };

  // SQLite: use raw ORDER BY RANDOM() for sampling
  const candidates = await prisma.question.findMany({
    where,
    select: { id: true, score: true },
  });
  if (candidates.length === 0) {
    return NextResponse.json({ error: "No questions match filter" }, { status: 400 });
  }
  // Fisher–Yates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const picked = candidates.slice(0, Math.min(effectiveCount, candidates.length));
  const maxScore = picked.reduce((s, q) => s + q.score, 0);

  const session = await prisma.interviewSession.create({
    data: {
      userId: userId ?? "local",
      mode,
      config: JSON.stringify({ count: effectiveCount, durationSec, typeFilter, difficultyFilter }),
      questionIds: JSON.stringify(picked.map((p) => p.id)),
      maxScore,
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    questionIds: picked.map((p) => p.id),
    maxScore,
    mode,
    durationSec,
  });
}
