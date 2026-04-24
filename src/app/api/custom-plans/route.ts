import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";

const Body = z.object({
  name: z.string().min(1).max(100),
  filters: z.object({
    tags: z.array(z.string()).optional(),
    types: z.array(z.string()).optional(),
    difficulties: z.array(z.string()).optional(),
    count: z.number().int().min(1).max(100),
  }),
  dueAt: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET() {
  const plans = await prisma.customPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { select: { questionId: true } } },
  });

  // completed count: attempts within [createdAt, now] on those question ids (correct=true)
  const results = await Promise.all(
    plans.map(async (p) => {
      const qIds = p.items.map((i) => i.questionId);
      const done = qIds.length
        ? await prisma.attempt.findMany({
            where: {
              questionId: { in: qIds },
              createdAt: { gte: p.createdAt },
              correct: true,
            },
            select: { questionId: true },
            distinct: ["questionId"],
          })
        : [];
      return {
        id: p.id,
        name: p.name,
        filters: JSON.parse(p.filters),
        createdAt: p.createdAt,
        dueAt: p.dueAt,
        total: qIds.length,
        completed: done.length,
      };
    })
  );

  return NextResponse.json({ plans: results });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { name, filters, dueAt, userId } = parsed.data;

  const where: {
    type?: { in: string[] };
    difficulty?: { in: string[] };
  } = {};
  if (filters.types?.length) where.type = { in: filters.types };
  if (filters.difficulties?.length) where.difficulty = { in: filters.difficulties };

  const candidates = await prisma.question.findMany({
    where,
    select: { id: true, tags: true },
  });

  // Tag filter (JSON string column): expand in JS
  const filtered = filters.tags?.length
    ? candidates.filter((q) => {
        let tags: string[] = [];
        try {
          tags = JSON.parse(q.tags) as string[];
        } catch {
          tags = [];
        }
        return filters.tags!.some((t) => tags.includes(t));
      })
    : candidates;

  if (filtered.length === 0) {
    return NextResponse.json({ error: "No questions match filter" }, { status: 400 });
  }

  // Fisher–Yates
  const pool = [...filtered];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, Math.min(filters.count, pool.length));

  const plan = await prisma.customPlan.create({
    data: {
      userId: userId ?? "local",
      name,
      filters: JSON.stringify(filters),
      dueAt: dueAt ? new Date(dueAt) : null,
      items: {
        create: picked.map((q, i) => ({ questionId: q.id, order: i })),
      },
    },
  });

  return NextResponse.json({ planId: plan.id, total: picked.length });
}
