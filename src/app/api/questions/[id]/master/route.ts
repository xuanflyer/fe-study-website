import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { INTERVALS_MS, MAX_STAGE } from "@/server/schedule/ebbinghaus";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const q = await prisma.question.findUnique({ where: { id }, select: { id: true } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const farFuture = new Date(now.getTime() + INTERVALS_MS[MAX_STAGE]);
  await prisma.reviewState.upsert({
    where: { questionId: id },
    create: {
      userId: "local",
      questionId: id,
      stage: MAX_STAGE,
      nextReviewAt: farFuture,
      lastReviewedAt: now,
      mastered: true,
    },
    update: { mastered: true, stage: MAX_STAGE, nextReviewAt: farFuture },
  });
  return NextResponse.json({ ok: true });
}
