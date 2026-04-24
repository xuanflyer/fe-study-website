import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const plan = await prisma.customPlan.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: {
          question: {
            select: { id: true, type: true, title: true, difficulty: true, source: true, score: true },
          },
        },
      },
    },
  });
  if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });

  const qIds = plan.items.map((i) => i.questionId);
  const correctAttempts = qIds.length
    ? await prisma.attempt.findMany({
        where: {
          questionId: { in: qIds },
          createdAt: { gte: plan.createdAt },
          correct: true,
        },
        select: { questionId: true },
        distinct: ["questionId"],
      })
    : [];
  const doneSet = new Set(correctAttempts.map((a) => a.questionId));

  return NextResponse.json({
    id: plan.id,
    name: plan.name,
    filters: JSON.parse(plan.filters),
    createdAt: plan.createdAt,
    dueAt: plan.dueAt,
    items: plan.items.map((i) => ({
      questionId: i.questionId,
      order: i.order,
      done: doneSet.has(i.questionId),
      question: i.question,
    })),
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.customPlan.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
