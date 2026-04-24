import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Range = "day" | "week" | "month";
const RANGE_DAYS: Record<Range, number> = { day: 1, week: 7, month: 30 };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = (url.searchParams.get("range") ?? "week") as Range;
  const days = RANGE_DAYS[range] ?? 7;

  const now = new Date();
  const since = new Date(now.getTime() - days * DAY_MS);

  const [attempts, totalQuestions, allStudied] = await Promise.all([
    prisma.attempt.findMany({
      where: { createdAt: { gte: since } },
      include: {
        question: { select: { id: true, type: true, difficulty: true, tags: true } },
      },
    }),
    prisma.question.count(),
    prisma.attempt.findMany({
      select: { questionId: true },
      distinct: ["questionId"],
    }),
  ]);

  const totalAttempts = attempts.length;
  const totalCorrect = attempts.filter((a) => a.correct).length;
  const uniqueQuestions = new Set(attempts.map((a) => a.questionId)).size;

  // byDay buckets covering [today - (days-1), today]
  const byDayMap = new Map<string, { attempts: number; correct: number }>();
  const todayStart = startOfDay(now);
  const bucketStart = new Date(todayStart.getTime() - (days - 1) * DAY_MS);
  for (let i = 0; i < days; i++) {
    const d = new Date(bucketStart.getTime() + i * DAY_MS);
    byDayMap.set(localDateKey(d), { attempts: 0, correct: 0 });
  }
  for (const a of attempts) {
    const key = localDateKey(a.createdAt);
    const slot = byDayMap.get(key);
    if (!slot) continue;
    slot.attempts += 1;
    if (a.correct) slot.correct += 1;
  }
  const byDay = Array.from(byDayMap.entries()).map(([date, v]) => ({ date, ...v }));

  const aggregate = <K extends string>(getKey: (a: (typeof attempts)[number]) => K) => {
    const m = new Map<K, { attempts: number; correct: number }>();
    for (const a of attempts) {
      const k = getKey(a);
      if (!k) continue;
      const slot = m.get(k) ?? { attempts: 0, correct: 0 };
      slot.attempts += 1;
      if (a.correct) slot.correct += 1;
      m.set(k, slot);
    }
    return Array.from(m.entries()).map(([key, v]) => ({
      key,
      attempts: v.attempts,
      correct: v.correct,
      accuracy: v.attempts ? v.correct / v.attempts : 0,
    }));
  };

  const byType = aggregate((a) => a.question.type).map((r) => ({
    type: r.key,
    attempts: r.attempts,
    correct: r.correct,
    accuracy: r.accuracy,
  }));
  const byDifficulty = aggregate((a) => a.question.difficulty).map((r) => ({
    difficulty: r.key,
    attempts: r.attempts,
    correct: r.correct,
    accuracy: r.accuracy,
  }));

  // tags JSON-string array on question; expand in JS
  const tagMap = new Map<string, { attempts: number; correct: number }>();
  for (const a of attempts) {
    let tags: string[] = [];
    try {
      tags = JSON.parse(a.question.tags) as string[];
    } catch {
      tags = [];
    }
    for (const t of tags) {
      const slot = tagMap.get(t) ?? { attempts: 0, correct: 0 };
      slot.attempts += 1;
      if (a.correct) slot.correct += 1;
      tagMap.set(t, slot);
    }
  }
  const byTag = Array.from(tagMap.entries())
    .map(([tag, v]) => ({
      tag,
      attempts: v.attempts,
      correct: v.correct,
      accuracy: v.attempts ? v.correct / v.attempts : 0,
    }))
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 10);

  // streakDays: consecutive days with at least one attempt, ending today
  // walk back from today; stop at first empty day
  const allAttempts = await prisma.attempt.findMany({
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  const daySet = new Set(allAttempts.map((a) => localDateKey(a.createdAt)));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = localDateKey(new Date(now.getTime() - i * DAY_MS));
    if (daySet.has(d)) streak += 1;
    else break;
  }

  return NextResponse.json({
    range,
    totals: {
      attempts: totalAttempts,
      correct: totalCorrect,
      accuracy: totalAttempts ? totalCorrect / totalAttempts : 0,
      uniqueQuestions,
      totalQuestions,
      studiedQuestions: allStudied.length,
    },
    byDay,
    byType,
    byDifficulty,
    byTag,
    streakDays: streak,
  });
}
