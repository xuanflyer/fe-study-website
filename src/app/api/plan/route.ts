import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return new Date(x.getTime() - 1);
}
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "today";
  const now = new Date();

  if (range === "today") {
    const todayEnd = endOfDay(now);
    const states = await prisma.reviewState.findMany({
      where: { mastered: false, nextReviewAt: { lte: todayEnd } },
      orderBy: { nextReviewAt: "asc" },
      include: {
        question: {
          select: { id: true, type: true, title: true, difficulty: true, source: true, score: true },
        },
      },
    });
    const todayStart = startOfDay(now);
    const completedToday = await prisma.attempt.count({
      where: { createdAt: { gte: todayStart } },
    });
    return NextResponse.json({
      range: "today",
      now: now.toISOString(),
      total: states.length,
      completedToday,
      items: states.map((s) => ({
        questionId: s.questionId,
        stage: s.stage,
        nextReviewAt: s.nextReviewAt,
        overdue: s.nextReviewAt.getTime() < now.getTime(),
        question: s.question,
      })),
    });
  }

  // week: bucket next 7 days (today inclusive)
  const weekStart = startOfDay(now);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS - 1);
  const states = await prisma.reviewState.findMany({
    where: { mastered: false, nextReviewAt: { lte: weekEnd } }, // include overdue
    orderBy: { nextReviewAt: "asc" },
    include: {
      question: {
        select: { id: true, type: true, title: true, difficulty: true, source: true, score: true },
      },
    },
  });

  type Item = (typeof states)[number];
  const buckets = new Map<string, Item[]>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getTime() + i * DAY_MS);
    buckets.set(localDateKey(d), []);
  }
  const overdueKey = localDateKey(weekStart);
  for (const s of states) {
    let key = localDateKey(s.nextReviewAt);
    if (s.nextReviewAt < weekStart) key = overdueKey;
    if (!buckets.has(key)) continue;
    buckets.get(key)!.push(s);
  }

  return NextResponse.json({
    range: "week",
    now: now.toISOString(),
    days: Array.from(buckets.entries()).map(([date, items]) => ({
      date,
      items: items.map((s) => ({
        questionId: s.questionId,
        stage: s.stage,
        nextReviewAt: s.nextReviewAt,
        overdue: s.nextReviewAt.getTime() < now.getTime(),
        question: s.question,
      })),
    })),
  });
}
